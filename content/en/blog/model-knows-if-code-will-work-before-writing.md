---
title: "The Model Knows if Code Will Work Before It's Even Written"
date: '2026-07-20'
description: "New research on the latent programming horizon: simple probing of a coding agent's hidden states predicts whether code will work, and even its future ~25 steps ahead. We are exploring the same latent space from a different angle - in candidate evaluation - and have reached the same conclusions."
tags: ['AI', 'LLM', 'Agents', 'Coding Agents', 'Research']
authors: ['slavb18']
language: 'en'
---

![Latent horizon: trajectory failure is visible from above earlier than the agent reaches it](../../../assets/blog/model-knows-if-code-will-work-before-writing.png)

A coding agent takes a task and gets to work: reads files, greps the project, runs tests, fixes code. The median attempt involves 52 steps and 36 thousand tokens. Often, it's clear early in this trajectory that the task won't be solved. But you only find out at the end, after tokens have been consumed.

Recent work "Latent Programming Horizons in Coding Agents" (Silva, Tu, Monperrus) shows: the model itself understands this much earlier. The answer already lies within its internal states.

## What They Did

They connected a simple classifier - logistic regression - to the agent's hidden states. The model was not fine-tuned, no new heads were added: pure linear probing of activations. The scale is significant - 1231 tasks from SWE-Bench Verified and Pro, about 22.7k agent runs, and ~80k code changes across two open models.

And this simple probing extracts from the activations:

- whether the entire code will work - AUC up to 0.83
- whether the number of failing tests decreased - up to 0.84
- whether the code compiles - up to 0.78
- whether the agent broke what was already working

0.5 here is random guessing, so the signal is strong. An important detail: it's best read not from the last layer, but roughly from the middle of the network. The final layer is tuned to predict the next token; the "understanding" of the code's state lives deeper.

## Latent Programming Horizon

It gets more interesting. Based on the internal state "now," not only the current code status but also the future status is partially predicted. The model senses the direction approximately 25 steps ahead: AUC ~0.55 on Verified and ~0.65 on the more complex Pro. A weak signal persists even at 50 steps - about 0.52 and 0.60. This is what they called the latent programming horizon.

A caveat not to overestimate the effect: a step is not necessarily a fix. The agent primarily reads and searches; in a median trajectory, there are only two actual code changes. This means the model doesn't hold a ready patch in its mind. It grasps the general direction early: either the task is being fixed - or the agent has already gone astray.

The practical implication is direct: a failing attempt can be stopped early, not after 36 thousand tokens. Branching, increasing effort, or employing a stronger model can be done based on an internal signal, rather than waiting for failure.

## We Read the Latent Space from a Different Angle

This resonates with us: we are currently exploring the same latent space, but in a different task - candidate evaluation.

In our case, a panel of experts debates not with text, but latently: LoRA adapters exchange hidden states, and we decode the latent itself - using our autoencoder (CALM) and through the model's head (logit-lens). In our runs, the latent is read at 89-95%, and the final outcome is calibrated (Brier 0.068). That is, we literally extract "what the model thinks" from its intermediate representation and convert it into an auditable decision.

And independently of the authors, we have come to the same three conclusions:

1.  **The signal lives in the middle, not at the output.** The last layer is about the next token; the meaning lies deeper. Our decoding of the latent debate also comes from intermediate states, not from the final answer.
2.  **Simple readout beats interpreting the output.** They found logistic regression sufficient; for us, a linear decoder on top of hidden states worked. The expensive part is not "reading" but getting the discriminative signal itself: in our case, it's provided by the latent expert debate.
3.  **The main prize is not reading the signal, but steering by it.** The authors explicitly state: the next step is to use the signal to control the agent. For us, this means escalating to a human when experts latently disagree - we intervene based on internal divergence, not final failure.

## In Short

The model knows more about its work than it expresses in its output. For both code and human evaluation, the useful "opinion" lies not in the final token, but in the middle of the network - and can be read by simple probing. The frontier is no longer "a bigger model," but the ability to listen to it mid-thought and intervene before the budget is consumed.

Paper: https://arxiv.org/abs/2607.05188

---

## 📚 Read Also

- [Latent Debate of LoRA Experts: Decoding What the Model Argues About](latent-debate-lora-experts-decoded)
- [Thinking in Concepts, Not Tokens: The ConceptLM Architecture](thinking-in-concepts-not-tokens-conceptlm-architecture)
- [Why an AI Agent Fails in Production: Harness Engineering](why-ai-agent-fails-production-harness-engineering)
- [CALM and Energy Score: Optimizing Vector Matching](tencent-calm-vector-matching-optimization)