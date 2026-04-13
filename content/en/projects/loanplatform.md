---
title: "Loan Origination Pipeline for a Bank"
date: '2025-02-01'
description: "Transforming a legacy loan process system into a distributed system based on microservices and Temporal."
tags: ['Fintech', 'Microservices', 'Temporal', 'AI']
authors: ['Iconicompany']
language: 'en'
startDate: '2022-07'
endDate: '2025-02'
team: 'fintech-banking'
teamLink: '/en/teams/fintech-banking'
---

## 🏦 Project: Loan Origination Pipeline for a Bank

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

### 📌 Context (as-is state)

We started by working on a legacy loan process system in a bank.

The system was a classic monolith that combined:

* loan application intake
* client verification
* collateral processing
* credit dossier assembly
* deal origination
* integrations with external services (Credit Bureau, collateral registries, CRM, agent's workstation)

System problems:

* tight coupling of modules within the monolith
* long application processing time
* lack of transparent stage control
* frequent failures during integrations
* inability to scale individual stages (e.g., collateral verification)
* difficulty implementing new rules and products

In essence, it was a "large data pipeline" that failed with any instability in one of its components.

---

## 🎯 Transformation Goal

We set the following goals:

* decompose the monolith into independent domain modules
* provide a managed business process orchestrator
* enhance the stability of the loan origination pipeline
* implement AI-powered document processing automation
* make the system scalable at each stage

---

## 🧩 Domain Decomposition

We divided the system into independent domain boundaries:

### 1. 📥 Application Intake

* a single entry point for applications (CRM / partners / agent's workstation)
* data normalization
* primary validation
* application deduplication

---

### 2. 🧾 Client and Collateral Check (Risk & Collateral Check)

* integrations with external sources (Credit Bureau, registries, anti-fraud)
* client scoring
* collateral property valuation
* calculation of limits and conditions

---

### 3. 🤖 Dossier Assembly using AI (Document Intelligence)

One of the key transformation modules.

We implemented an AI pipeline:

* document upload (PDFs, images, scans)
* OCR and entity extraction
* LLM processing for:

* document classification
* extraction of key fields (Full Name, amounts, dates, collateral objects)
* completeness check of the dossier
* automated generation of a structured credit dossier

Result:

* reduction in manual document review
* decrease in errors during dossier assembly
* acceleration of the deal preparation stage

---

### 4. 📦 Case Assembly Module

* collection of all verification results
* aggregation of data from different domains
* construction of a unified credit case
* data completeness control before the final decision

---

### 5. ✍️ Deal Origination

* generation of contracts and loan documents
* integration with EDMS (Electronic Document Management System)
* final agreement on terms
* recording the transaction in the bank's accounting systems

---

## ⚙️ New Solution Architecture

### 🧠 Orchestration: Temporal

We used Temporal as the core process management engine:

* each loan = a separate workflow
* each stage = an activity
* guarantees:

* retry on errors
* state preservation
* recovery after failures
* idempotency of operations

Temporal allowed us to transform the loan process into an **observable state machine**, rather than "a script that sometimes crashes".

---

### ☸️ Infrastructure: Kubernetes

The entire system was deployed on Kubernetes:

* each domain module - a separate deployment
* horizontal scaling:

* OCR/AI separately
* risk scoring separately
* integrations separately
* fault isolation between services

---

### 🧱 Microservices Architecture

Each domain became a separate service:

* Application Service
* Risk Service
* Collateral Service
* Document AI Service
* Case Assembly Service
* Deal Service

Communications:

* synchronous calls (gRPC/HTTP) for quick verifications
* asynchronous events via queues for heavy operations

---

## 🔄 How the Process Looks (end-to-end)

1. A loan application is submitted
2. Temporal initiates a workflow
3. In parallel:

* the client is verified
* collateral is evaluated
* AI document processing is initiated
4. Data flows into Case Assembly
5. Completeness and consistency are checked
6. If everything is OK - deal origination is initiated
7. The transaction is recorded in the bank's systems

---

## 🚀 Key Results

After transitioning to the new architecture:

* application processing time significantly decreased
* process stability increased (no "pipeline crashes")
* individual stages can be scaled independently
* implementation of new loan products accelerated
* full traceability for each loan was achieved
* manual document processing workload significantly reduced

---

## 💡 Main Architectural Shift

The most important change was not technological, but conceptual:

> we stopped thinking about a loan as a monolith and started thinking about it as a managed distributed process (workflow), where each step is independent, observable, and recoverable.

