---
title: "Compress Four Tokens into One Vector: Running CALM Autoencoder on Domain-Specific Data (and on a Single CPU)"
date: '2026-06-11'
description: "We took the autoencoder from the recent CALM (Continuous Autoregressive Language Models) work, which learns to pack a chunk of K=4 tokens into a single continuous vector and unpack it back, and trained it not on 15 billion Pile tokens on 8 GPUs, as in the original, but on 18 thousand short strings of requirements from IT job postings - on a regular machine without a graphics card. Along the way, we encountered three classic pitfalls (flash-attn without CUDA, deepspeed that doesn't import under NumPy 2.x, and a silent OOM on 33 GB of logits). Below is a detailed analysis of the architecture, configurations, and honest round-trip reconstruction results."
tags: ["CALM", "Autoencoder", "Machine Learning", "Deep Learning", "NLP", "LLM", "CPU", "Domain Adaptation", "Python", "VAE", "Optimization", "Development", "Infrastructure", "NumPy 2.0", "DeepSpeed", "Flash Attention", "GPU-free"]
authors: ['slavb18']
language: 'en'
---

![Title](../../../assets/blog/compress-tokens-calm-autoencoder-cpu-domain-adaptation.png)

We took the autoencoder from the recent **CALM (Continuous Autoregressive Language Models)** work, which learns to pack a chunk of K=4 tokens into a single continuous vector and unpack it back, and trained it not on 15 billion Pile tokens on 8 GPUs, as in the original, but on 18 thousand short strings of requirements from IT job postings - on a regular machine without a graphics card. Along the way, we encountered three classic pitfalls (flash-attn without CUDA, deepspeed that doesn't import under NumPy 2.x, and a silent OOM on 33 GB of logits). Below is a detailed analysis of the architecture, configurations, and honest round-trip reconstruction results.

---

## 💡 Why Change Anything in Language Models at All

Modern LLMs run into a fundamental limitation: they generate text **one token at a time**. Generate a token → feed it back into the input → generate the next one. The longer the response, the more sequential autoregressive steps, and this inherently doesn't parallelize well.

The authors of [CALM](https://arxiv.org/abs/2510.27688) ([GitHub](https://github.com/shaochenze/calm), [blog](https://shaochenze.github.io/blog/2025/CALM)) propose shifting the paradigm: instead of predicting a single discrete token, the model predicts **one continuous vector** that encodes **a chunk of K tokens** at once. If K=4, the number of autoregressive steps drops by a factor of 4.

A new scaling axis emerges - the authors call it **semantic bandwidth (K)**: one can increase not only parameters and data, but also the amount of information processed in one step.

For this to work, two models are needed:

1.  **High-fidelity Autoencoder** - learns to compress K tokens into one vector and reconstruct them almost without loss. This is the "dictionary" between the discrete world of tokens and the continuous latent space.
2.  **Continuous-domain LM** - an autoregressive model that predicts the next vector in this continuous space (rather than the next token).

Since we are moving away from the discrete softmax world, standard maximum likelihood is no longer directly applicable - which is why CALM includes a whole likelihood-free toolkit: **Energy-based training**, the **BrierLM** metric, and **temperature sampling** on top of a black-box sampler.

This article focuses on **the first stage, the autoencoder**. It determines how well the entire endeavor is even possible: if a chunk of tokens cannot be reconstructed from a vector, then modeling in that space is pointless.

---

## 📚 Menagerie of Models in the Repository

To clarify where our experiment fits in, here's what's in the CALM repository:

| Model | What it Does | Parameters |
|:---|:---|:---|
| **Autoencoder** | K tokens ↔ vector compression (stage 1) | 75M |
| **CALM-M / L / XL** | continuous autoregression (stage 2) | 371M / 735M / 1.82B |
| **AR baseline** | standard token-based transformer for comparison | - |

For stage 2, three variants of the **generative "head"** that models the distribution of the next vector are provided:

-   **Energy-based** (`train_energy.py`) - primary, best quality;
-   **Diffusion** (`train_diffusion.py`);
-   **Flow Matching** (`train_flow.py`).

Quality in the paper is measured by the **BrierLM** metric: CALM-M yields 5.72, CALM-XL - 8.53, a token-based baseline of comparable size - 6.05. The energy head outperformed diffusion and flow in their experiments.

We did not delve into all this richness - our focus is strictly on the autoencoder.

---

## 🏗️ Autoencoder Architecture: Layer by Layer Breakdown

This is the most interesting part. The CALM autoencoder is not a "transformer encoder," as one might expect. It is a **variational autoencoder (VAE) operating within a patch, entirely on MLP layers, without self-attention**. Let's examine why and how.

### Base Block: AELayer (MLP, No Attention)

python
class AELayer(nn.Module):
    def __init__(self, config):
        self.mlp = LlamaMLP(config)                 # SwiGLU as in LLaMA
        self.layernorm = LlamaRMSNorm(config.hidden_size, eps=config.rms_norm_eps)

    def forward(self, hidden_states):
        residual = hidden_states
        hidden_states = self.layernorm(hidden_states)
        hidden_states = self.mlp(hidden_states)
        return residual + hidden_states             # pre-norm + residual


No attention whatsoever. This is crucial: the autoencoder processes each patch of K tokens **independently** of its neighbors. Its task is local chunk compression/decompression, not modeling long-range dependencies. Context and sequence are already the job of the autoregressive model in stage 2. Therefore, the AE can be made cheap and fast.

### Encoder: 4 Tokens → One Vector

Data flow (for K=`patch_size`=4, `hidden_size`=512, `latent_size`=128):

1.  Input `input_ids` is reshaped into patches: `(B, L) → (B·L/4, 4)`.
2.  Embeddings: `(N, 4) → (N, 4, 512)`.
3.  **Stage 0:** one `AELayer` over 4 tokens.
4.  **Squeeze:** concatenate 4 tokens and compress - `Linear(4·512 → 512)`. This is where patch compression happens: `(N, 4, 512) → (N, 1, 512)`.
5.  **Stage 1:** another `AELayer`.
6.  `hidden_to_latent`: `Linear(512 → 256)` → `(N, 1, 256)`.

Why 256, not 128? Because this is a **VAE**: 256 = `latent_size·2` - half for `mean`, half for `log_std`.

python
mean, log_std = torch.chunk(latent_states, 2, dim=-1)   # 128 each
std = torch.exp(log_std)
eps = torch.randn_like(mean)
latent_states = mean + eps * std                        # reparameterization
kl_loss = 0.5 * (mean**2 + std**2 - 1 - 2*log_std)
kl_loss = torch.clamp(kl_loss, min=config.kl_clamp).sum(-1).mean()


So the latent is not just a vector, but parameters of a Gaussian from which it is sampled. The KL term with `kl_clamp=0.5` and `kl_weight=1e-3` regularizes the space to be smooth (important for stage 2, where autoregression needs to "walk" through it).

### Decoder: Vector → 4 Tokens

Symmetric to the encoder:

1.  `latent_to_hidden`: `Linear(128 → 512)`.
2.  **Stage 0:** one `AELayer`.
3.  **Expand:** `Linear(512 → 4·512)` and reshape back to 4 positions - "decompressing" the patch.
4.  **Stage 1:** another `AELayer`.
5.  `lm_head`: projection to the vocabulary. `lm_head` weights are **tied** to the encoder's embedding matrix - this saves parameters and stabilizes training.

The reconstruction loss is standard cross-entropy per token, in training mode multiplied by `patch_size` and added to KL:

python
loss = CrossEntropy(logits, labels)
if self.training:
    loss = loss * patch_size + kl_loss * kl_weight


### Hyperparameters (Default Config)

| Parameter | Value |
|:---|:---|
| `patch_size` (K) | 4 |
| `hidden_size` | 512 |
| `intermediate_size` (MLP) | 1280 |
| `latent_size` | 128 |
| `num_encoder_layers` | 2 |
| `num_decoder_layers` | 2 |
| `ae_dropout` | 0.15 |
| `kl_weight` / `kl_clamp` | 1e-3 / 0.5 |
| tokenizer | Llama-3 (~128k vocabulary) |
| total parameters | ~75.8M |

Interesting fact: out of 75.8M parameters, **the vast majority is the embedding table** (~128k x 512 ≈ 65M). The "logic" of the encoder-decoder itself weighs in at a few million. So this is a very lightweight model - which makes it realistic to run without a GPU.

---

## 🔬 Our Experiment: Domain Adaptation on Job Postings

In the original work, the autoencoder is trained on ~15 billion tokens from the [pile-uncopyrighted](https://huggingface.co/datasets/monology/pile-uncopyrighted) dataset, on 8 GPUs, in bf16, for 30,000 steps. We were interested in something different: **how would this architecture behave on a narrow domain and modest hardware?**

### Data

`jobs_requirements.jsonl` - 18,065 short strings of requirements from IT job postings, a mix of Russian and English:

json
{"text": "React JS 18+"}
{"text": "Понимание REST API"}
{"text": "Уверенное знание JavaScript: замыкания, асинхронное программирование (async/await | Promises), ES6+"}


In total, after tokenization and concatenation, we got ~340k tokens. This is, of course, five to six orders of magnitude less than the original - so this is a **proof-of-concept of domain adaptation, not a reproduction of the paper's results**. Let's agree on this upfront, to honestly look at the numbers later.

### Hardware

A machine without a graphics card: **62 GB RAM, 28 CPU cores, neither `nvidia-smi` nor `nvcc`**, `torch.cuda.is_available() == False`. That is, the conditions are as "consumer-grade" as possible.

### Run Configuration

| Parameter | Original (paper) | Our run |
|:---|:---|:---|
| data | ~15B Pile tokens | 18k job posting strings (~340k tokens) |
| device | 8x GPU, bf16 | 1x CPU, fp32 |
| `block_size` | 2048 | **256** (see pitfalls below) |
| `per_device_train_batch_size` | 8 | 32 |
| `learning_rate` | 3e-4 | 2e-4 |
| epochs / steps | 1 epoch / 30,000 steps | 5 epochs / 220 steps |
| `latent_size`, `patch_size` | 128, 4 | 128, 4 |

---

## 🚧 Three Pitfalls Along the Way (the reason people read Habr)

### 1. flash-attn Does Not Compile Without CUDA

`requirements.txt` pulls `flash-attn==2.1.1`, which requires `nvcc` for compilation and a GPU for runtime. It simply cannot be installed on a CPU-only machine. The solution is to install everything else, excluding it:

bash
grep -v '^flash-attn' requirements.txt | uv pip install -r /dev/stdin


Fortunately, the autoencoder itself does not use flash-attn (it's only imported by the energy/flow/diffusion/calm heads, and even then, under `if is_flash_attn_2_available()`).

### 2. deepspeed Does Not Import Under NumPy 2.x

Training crashed **inside** `Trainer.train()` with this traceback:


File ".../accelerate/utils/other.py", line 80, in extract_model_from_parallel
    from deepspeed import DeepSpeedEngine
...
File ".../deepspeed/autotuning/scheduler.py", line 8
    from numpy import BUFSIZE
ImportError: cannot import name 'BUFSIZE' from 'numpy'


`numpy.BUFSIZE` was removed in NumPy 2.0, and `deepspeed==0.10.0` depends on it. At the same time, HF-`accelerate` imports deepspeed **only if it's installed** (`is_deepspeed_available()` = "package is present"). Deepspeed is needed for distributed training on GPUs - we don't have it and cannot have it. So the cleanest solution is simply to uninstall it:

bash
uv pip uninstall deepspeed


(Downgrading NumPy is risky: pandas/pyarrow wheels in the environment are compiled for NumPy 2.x, risking ABI incompatibility.)

### 3. Silent OOM on 33 GB of Logits

The most instructive. With the default `block_size=2048`, the process **silently died on step zero** - without a traceback, it just disappeared. Classic signature of an OOM killer (SIGKILL).

The reason is the shape of the logits tensor. The decoder outputs logits for the **entire vocabulary for each position**:


logits: (batch x block_size x vocab) = 32 x 2048 x 128256 x 4 bytes ≈ 33.6 GB


Plus the same amount for the gradient in backward → ~67 GB for one step with 56 GB available. Hence the immediate kill. In the original, the fact that the batch was 8 and training ran on a GPU with large memory saved it.

Solution: logits are linear in `batch x block_size`. Our data is short, so a large `block_size` is not needed. We reduced it to **256** (kept batch at 32):


32 x 256 x 128256 x 4 ≈ 4.2 GB   ← fits with huge headroom


The process's RSS after the fix stayed at ~6.6 GB - stable.

---

## 🚀 Final Run Script

All changes were consolidated into a reproducible launcher (important: run **as a module** `-m train.train_autoencoder` from the repository root, otherwise `import models` won't resolve):

bash
.venv/bin/python -m train.train_autoencoder \
    --train_file ./data/jobs_requirements.json \
    --validation_file ./data/jobs_requirements.json \
    --tokenizer_name ./llama3_tokenizer \
    --config_overrides "latent_size=128" \
    --block_size 256 \
    --output_dir ./checkpoints/autoencoder_requirements \
    --overwrite_output_dir \
    --per_device_train_batch_size 32 \
    --per_device_eval_batch_size 32 \
    --learning_rate 2e-4 \
    --num_train_epochs 5 \
    --do_train --do_eval \
    --save_safetensors False \
    --logging_steps 10 --report_to none


Small details you can also stumble upon:
- The `--validation_file` argument does not accept the `.jsonl` extension (only csv/json/txt) - we created a `.json` symlink.
- `--save_safetensors False` is mandatory: the model has tied weights (`lm_head` ≡ embeddings), and safetensors refuses to serialize shared tensors.

---

## 📊 Results

Training: **220 steps, 5 epochs, 22 minutes on CPU.** Loss decreased monotonically (from ~47 at random initialization to ~10.6 by the fifth epoch on the training target).

| Metric | Value |
|:---|:---|
| eval_loss | 2.20 |
| **eval perplexity** | **9.04** |
| train_runtime | 22 min 20 s |
| examples/s | 5.2 (train) / 14.3 (eval) |

> Why is train-loss (~10.6) higher than eval-loss (2.20)? In training mode, the model multiplies the reconstruction loss by `patch_size`, adds KL, casts embeddings to bf16, and applies `ae_dropout=0.15`; during eval, all of this is disabled and pure fp32 is calculated. So the discrepancy is expected; it's not a bug.

### Self-Check: Round-Trip Through Encoder and Decoder

The main test for an autoencoder is to run a phrase `text → encoder → latent → decoder → text` and compare. We do this deterministically: in `eval()`, taking the **`mean` of the latent** directly (bypassing VAE sampling), and preparing the input as during training (add EOS, pad to a multiple of K):

python
ids = tok(text)["input_ids"] + [tok.eos_token_id]
while len(ids) % P: ids.append(pad_id)
x = torch.tensor(ids).view(1, -1).reshape(-1, P)   # patches (L/4, 4)
latent = model.encoder(input_ids=x)
mean, _ = torch.chunk(latent, 2, dim=-1)           # take mean
logits = model.decoder(latent_states=mean)
pred = logits.argmax(-1).reshape(-1)               # reconstructed tokens


What we got:

| Input | Output | Token Accuracy |
|:---|:---|:---|
| `React JS 18+` | `React от 3+` | 75% |
| `Understanding of REST API` | `егра и REST API` | 75% |
| `Уверенное знание JavaScript: замыкания, асинхронное программирование (async/await | Promises), ES6+` | `Уверенное знание JavaScript:овыкания, асинхронное программирование ( CI/CD,тами), егра+` | 75% |

### Honest Analysis

The reconstruction is **recognizable but noisy**: the framework and significant chunks are preserved ("React ... +", "REST API", "Proficient in JavaScript: ... asynchronous programming ..."), but approximately every fourth token is distorted. And this is not a coincidence: exactly **75% on phrases of completely different lengths** - a strong signal that the model systematically loses ~1 token from each 4-token patch. Given that the 128-number latent compresses a 4x512 = 2048-dimensional patch representation, and training lasted only 5 epochs on a tiny dataset - this looks like **underfitting**, rather than an architectural limit. In the paper, "near-perfect reconstruction" is achieved on 15 billion tokens; we provided the model with ~44,000 times less data.

---

## ⏭️ What's Next

Obvious levers to increase reconstruction accuracy on the same domain:

-   **more epochs** (20-50 instead of 5) - data is scarce, overfitting here is rather a plus for AE reconstruction;
-   **more data** from the same domain;
-   if a GPU becomes available - restore original `block_size`/`batch` and bf16, training will accelerate by orders of magnitude;
-   experiment with `latent_size` (wider latent → more accurate reconstruction, but a "heavier" space for stage 2) and with `kl_weight`.

### Conclusions

1.  The CALM autoencoder is an **MLP-VAE on patches without attention**, and this is sensible: the task of local chunk compression does not require context modeling.
2.  The architecture is **lightweight enough to run on a CPU** - 75M parameters, 87% of which are embeddings.
3.  The main practical obstacles turned out to be not in ML, but in infrastructure: `deepspeed`/NumPy incompatibility and OOM due to full-size logits over a 128k vocabulary. Both are fixable in a minute if the cause is understood.
4.  On a microscopic domain-specific dataset, in 22 minutes on a CPU, we obtain a functional but lossy autoencoder (perplexity 9.04, ~75% reconstruction accuracy) - an excellent starting point for further hyperparameter tuning.

Experiment code: launcher `train/run_autoencoder_requirements.sh` and verification script `roundtrip_autoencoder.py`. Fork [iconicompany/calm](https://github.com/iconicompany/calm), original - [shaochenze/calm](https://github.com/shaochenze/calm), paper - [arXiv:2510.27688](https://arxiv.org/abs/2510.27688).

---

## 📚 Read Also

- [Application of SimVQ, CALM, ConceptLM, and LCM Models in HR Domain Professional Concept Extraction and Analysis 🧠](application-of-simvq-calm-conceptlm-lcm-in-hr-concept-extraction-analysis)
- [How We "Hack" HR-Tech: A Discussion with CALM's Author from Tencent AI](hrtech-energy-score-pipeline-calm)
- [Methods for Extracting Skills from Resumes and Job Postings](skills-extraction-methods)
- [From Cosine Similarity to the "Energy" of Meanings: How Tencent CALM Research Changes the Rules of AI Recruitment](tencent-calm-vector-matching-optimization)
- [Your AI Agent Is Useless If It Doesn't Learn](ai-agent-self-evolution)