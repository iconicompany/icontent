---
title: "Credit Conveyor for a Bank"
date: '2025-02-01'
description: "Transformation of a legacy credit process system into a distributed system based on microservices and Temporal."
tags: ["Fintech", "Microservices", "Temporal", "AI"]
authors: ["Iconicompany"]
language: 'en'
startDate: '2022-07'
endDate: '2025-02'
team: 'fintech-banking'
teamLink: '/en/teams/fintech-banking'
---

## 🏦 Project: Credit Conveyor for a Bank

### 📌 Context (as-is state)

We started by working on a legacy credit process system in a bank.

The system was a classic monolith that combined:

* loan application intake
* client verification
* collateral processing
* credit dossier formation
* deal origination
* integrations with external services (Credit Bureau, collateral registers, CRM, Agent Workstation)

System Problems:

* tight coupling of modules within the monolith
* long application processing time
* lack of transparent stage control
* frequent integration failures
* inability to scale individual stages (e.g., collateral verification)
* difficulty in implementing new rules and products

In essence, it was a "large data stream" that failed with any instability in one of its components.

---

## 🎯 Transformation Goal

We set the following objectives:

* decompose the monolith into independent domain modules
* provide a managed business process orchestrator
* increase the resilience of the credit conveyor
* implement document processing automation using AI
* make the system scalable at each stage

---

## 🧩 Domain Decomposition

We divided the system into independent domain boundaries:

### 1. 📥 Application Intake

* single entry point for applications (CRM / partners / Agent Workstation)
* data normalization
* initial validation
* application deduplication

---

### 2. 🧾 Risk & Collateral Check

* integrations with external sources (Credit Bureau, registers, anti-fraud)
* client scoring
* collateral valuation
* limit and terms calculation

---

### 3. 🤖 Dossier Formation with AI (Document Intelligence)

One of the key transformation modules.

We implemented an AI pipeline:

* document upload (PDF, images, scans)
* OCR and entity extraction
* LLM processing for:

* document classification
* extraction of key fields (full name, amounts, dates, collateral objects)
* dossier completeness check
* automatic generation of a structured credit dossier

Result:

* reduction in manual document verification
* reduction of errors during dossier formation
* acceleration of the deal preparation stage

---

### 4. 📦 Case Assembly Module

* collection of all verification results
* data aggregation from different domains
* construction of a unified credit case
* data completeness control before the final decision

---

### 5. ✍️ Deal Origination

* generation of agreements and credit documents
* integration with EDM (Electronic Document Management)
* final approval of terms
* deal recording in the bank's accounting systems

---

## ⚙️ New Solution Architecture

### 🧠 Orchestration: Temporal

We used Temporal as the core of process management:

* each loan = a separate workflow
* each stage = an activity
* guarantees:

* retry on errors
* state persistence
* recovery after failures
* idempotency of operations

Temporal allowed us to transform the credit process into an **observable state machine**, rather than a "script that sometimes fails".

---

### ☸️ Infrastructure: Kubernetes

The entire system was deployed on Kubernetes:

* each domain module - a separate deployment
* horizontal scaling:

* OCR/AI independently
* risk scoring independently
* integrations independently
* fault isolation between services

---

### 🧱 Microservice Architecture

Each domain became a separate service:

* Application Service
* Risk Service
* Collateral Service
* Document AI Service
* Case Assembly Service
* Deal Service

Communications:

* synchronous calls (gRPC/HTTP) for quick checks
* asynchronous events via queues for heavy operations

---

## 🔄 The Process (end-to-end)

1. A loan application is received
2. Temporal initiates a workflow
3. In parallel:

* the client is checked
* collateral is evaluated
* AI document processing is initiated
4. Data converges in Case Assembly
5. Completeness and consistency are checked
6. If all is well, deal origination is launched
7. The deal is recorded in the bank's systems

---

## 🚀 Key Results

After transitioning to the new architecture:

* significantly reduced application processing time
* increased process stability (no "conveyor failures")
* individual stages can be scaled independently
* implementation of new credit products accelerated
* full traceability of each loan was achieved
* manual document processing workload significantly reduced

---

## 💡 Main Architectural Shift

The most important change was not technological, but conceptual:

> we stopped thinking about credit as a monolith and started thinking about it as a managed distributed process (workflow), where each step is independent, observable, and recoverable.

---

## 📸 Gallery

![loanplatform-01](./loanplatform/loanplatform-01.jpg)
![loanplatform-02](./loanplatform/loanplatform-02.jpg)
![loanplatform-03](./loanplatform/loanplatform-03.jpg)
![loanplatform-04](./loanplatform/loanplatform-04.jpg)
![loanplatform-05](./loanplatform/loanplatform-05.jpg)
![loanplatform-06](./loanplatform/loanplatform-06.jpg)
![loanplatform-07](./loanplatform/loanplatform-07.jpg)
![loanplatform-08](./loanplatform/loanplatform-08.jpg)
![loanplatform-09](./loanplatform/loanplatform-09.jpg)
![loanplatform-10](./loanplatform/loanplatform-10.jpg)
![loanplatform-11](./loanplatform/loanplatform-11.jpg)

