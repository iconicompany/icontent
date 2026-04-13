## 🏦 Project: Loan Conveyor for "Bystro-bank"

### 📌 Context (as-is state)

We started by working on the legacy loan processing system at "Bystro-bank".

The system was a classic monolith that mixed:

* loan application intake
* client verification
* collateral processing
* loan dossier formation
* deal origination
* integrations with external services (credit bureaus, collateral registries, CRM, agent's workstation)

System problems:

* tight coupling of modules within the monolith
* long application processing time
* lack of transparent stage control
* frequent integration failures
* inability to scale individual stages (e.g., collateral verification)
* difficulty implementing new rules and products

In essence, it was a "large data pipeline" that failed with any instability in one of its components.

---

## 🎯 Transformation Goal

Our objective was:

* to decompose the monolith into independent domain modules
* to provide a manageable business process orchestrator
* to increase the stability of the loan conveyor
* to implement document processing automation using AI
* to make the system scalable at each stage

---

## 🧩 Domain Decomposition

We broke down the system into independent domain contours:

### 1. 📥 Application Intake

* single entry point for applications (CRM / partners / agent's workstation)
* data normalization
* initial validation
* application deduplication

---

### 2. 🧾 Risk & Collateral Check

* integrations with external sources (credit bureaus, registries, anti-fraud)
* client scoring
* collateral property valuation
* calculation of limits and terms

---

### 3. 🤖 Document Intelligence with AI

One of the key transformation modules.

We implemented an AI pipeline:

* document upload (PDF, images, scans)
* OCR and entity extraction
* LLM processing for:

* document classification
* extraction of key fields (full name, amounts, dates, collateral objects)
* dossier completeness check
* automatic generation of structured loan dossiers

Result:

* reduction in manual document review
* reduction of errors during dossier formation
* acceleration of the deal preparation stage

---

### 4. 📦 Case Assembly Module

* collection of all verification results
* aggregation of data from different domains
* construction of a unified credit case
* data completeness control before final decision

---

### 5. ✍️ Deal Origination

* generation of agreements and loan documents
* integration with EDO (Electronic Document Interchange)
* final agreement on terms
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

Temporal allowed us to transform the loan process into an observable state machine, rather than "a script that sometimes fails".

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

* synchronous calls (gRPC/HTTP) for quick checks
* asynchronous events via queues for heavy operations

---

## 🔄 How the Process Looks (End-to-End)

1. A loan application is received
2. Temporal initiates a workflow
3. In parallel:

* client is verified
* collateral is appraised
* AI document processing is launched
4. Data flows into Case Assembly
5. Completeness and consistency are checked
6. If all is OK - deal origination is launched
7. The deal is recorded in the bank's systems

---

## 🚀 Key Results

After transitioning to the new architecture:

* loan application processing time was significantly reduced
* process stability increased (no "conveyor failures")
* individual stages can be scaled independently
* the introduction of new loan products accelerated
* full traceability of each loan became available
* manual document processing workload significantly decreased

---

## 💡 Main Architectural Shift

The most important change was not technological, but conceptual:

> we stopped thinking about a loan as a monolith and started thinking about it as a managed distributed process (workflow), where each step is independent, observable, and recoverable.

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

