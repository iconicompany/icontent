---
title: "Thinking in Concepts, Not Tokens: Deconstructing the ConceptLM Architecture"
date: '2026-06-12'
description: "Modern LLMs face the limitation of token-by-token generation. ConceptLM offers an elegant solution by combining CALM's macro-planning concept with SimVQ's mathematical stability, allowing models to think in large, abstract blocks and effectively maintain long context."
tags: ["ConceptLM","CALM","SimVQ","LLM Architecture","AI Research","Vector Quantization","Product Quantization","Generative AI"]
authors: ["slavb18"]
language: 'en'
---

![Title](../../../assets/blog/thinking-in-concepts-not-tokens-conceptlm-architecture.png)

# Thinking in Concepts, Not Tokens: Deconstructing the ConceptLM Architecture

Modern LLMs have achieved tremendous breakthroughs, but they still carry one fundamental "birth trauma" - 🧠 **token-by-token generation**. By outputting text one small piece at a time, the model is literally deprived of strategic planning capabilities. It doesn't know how a sentence will end until it finishes writing it. This severely limits abstract thinking and complicates the retention of long context.

Various approaches are being tried to solve this problem. For example, the CALM (Compositional Autoregressive Language Modeling) architecture proposed moving away from tokens in favor of continuous semantic blocks. However, developers encountered numerous mathematical challenges during its training.

And this is where 🚀 **ConceptLM** enters the scene - an architectural bridge that adopts the elegant philosophy of CALM but grounds it on the rigid, stable mathematical foundation of **SimVQ** methods.

Let's delve into how this architecture works and why it might change our approach to training language models.

## 1. The CALM Ideology: Moving from Tokens to Macro-Planning

ConceptLM fully embraces CALM's core idea: stop proliferating minuscule tokens; it's time to operate with broad strokes.

The architecture achieves this through two key mechanisms:

*   📦 **Token Grouping (Chunking):** Instead of processing each token individually, ConceptLM compresses several tokens into a single semantic unit. In its basic implementation, one such block (chunk) equals `K=4` tokens.

*   ✌️ **Two-Level Generation:** The model operates in two steps. First, it predicts a future high-level block (an abstract concept), and only then, using it as a solid semantic framework, generates the final text tokens.

> 💡 **What does this achieve?** The sequence length at the upper level is reduced by `K` times. It becomes significantly easier for the model to maintain long-range causal relationships, as the context is no longer "diluted" into thousands of tiny tokens.

## 2. The Magic of SimVQ: Taming the Latent Space

The main problem with the original CALM was its venture into a *continuous* latent space. And controlling an infinite space of meanings is incredibly challenging.

ConceptLM elegantly solves this: the model remains in a **discrete latent space**. To achieve this, the authors created a fixed dictionary of concepts using Vector Quantization, borrowing approaches from **SimVQ** technology.

Here, ConceptLM engineers elegantly sidestepped two classic pitfalls:

### 💥 Problem #1: Codebook Collapse

In ordinary VQ models, a catastrophe often occurs: the model starts using only a couple of hundred codes from the dictionary to describe everything, while the remaining thousands of options simply "die" and are ignored.

✅ **Solution:** ConceptLM directly borrows a trick from SimVQ. Before quantization, embeddings are passed through a special MLP layer with `ReLU` activation. This simple geometric transformation expands the feature space and forces the model to utilize **almost `100%` of the available codebook** (high codebook utilization).

### 🤯 Problem #2: Combinatorial Explosion

To describe the vast diversity of human thoughts, a gigantic concept dictionary is needed. If done "naively," the model would swell to unmanageable sizes.

✅ **Solution:** The application of **Product Quantization**. A concept vector is split into `S` independent segments. Each segment is quantized with its own small, compact dictionary of size `N` (e.g., `N=64`).

As a result, we get a combinatorially enormous space of possible concepts: `N^S` (for example, if `S=8` and `N=64`, then `64^8` possible concepts).

Meanwhile, the physical size of the model's parameters remains modest and lightweight.

## 3. The Main Difference Between ConceptLM and CALM: Farewell, Energy Score; Hello, Good Old Softmax

This is arguably ConceptLM's main technological advantage.

Since the original CALM operates in a continuous space, it's impossible to directly calculate the familiar likelihood. CALM's authors had to build complex training overheads: energy-based methods (Energy Score) or diffusion processes. This makes training finicky and computationally expensive.

ConceptLM, thanks to discretization via SimVQ, brings us back to the comfortable world of classical ML:

| Criterion | CALM | ConceptLM |
|---|---|---|
| **Space Type** | Continuous | Discrete |
| **Concept Dictionary** | Infinite | Finite (due to quantization) |
| **Training Method** | Likelihood-free (Energy Score / Diffusion) | Standard Maximum Likelihood |
| **Prediction Method** | Complex iterative approximations | Standard linear projections (logits) + Softmax |

For predicting the next concept, ConceptLM uses standard probability distribution calculation across a finite dictionary of segments. 📊 No magic or workarounds - classic cross-entropy that scales beautifully.

---

✨ **ConceptLM** is an excellent example of healthy pragmatism in AI engineering. The authors took a powerful yet complex-to-implement macro-planning concept (CALM) and combined it with a proven, stable quantization tool (SimVQ).

The result is an architecture that can "think" in large abstract blocks, effectively maintain long context, yet trains using good old, predictable class prediction methods. It's quite possible that the future of the next generation of LLMs lies precisely with such hybrid approaches.

---

## 📚 Read Also

- [Application of SimVQ, CALM, ConceptLM, and LCM models in tasks of extracting and analyzing professional concepts in the HR domain 🧠](application-of-simvq-calm-conceptlm-lcm-in-hr-concept-extraction-analysis)
- [Compressing Four Tokens into One Vector: Running a CALM Autoencoder on Domain-Specific Data (and on a Single CPU)](compress-tokens-calm-autoencoder-cpu-domain-adaptation)
- [How We "Hack" HR-Tech: A Discussion with the Author of CALM from Tencent AI](hrtech-energy-score-pipeline-calm)
- [From Cosine Similarity to "Energy" of Meanings: How Tencent CALM Research Changes the Rules of the Game in AI Recruitment](tencent-calm-vector-matching-optimization)