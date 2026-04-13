---
title: "Investment Platform for Car Procurement Financing"
date: '2024-02-01'
description: "Development of an investment platform for car procurement financing"
tags: ['Fintech', 'Microservices', 'Temporal', 'AI']
authors: ['Iconicompany']
language: 'en'
startDate: '2022-07'
endDate: '2025-06'
team: 'fintech-banking'
teamLink: '/en/teams/fintech-banking'
---

## 💰 Project: Investment Platform for Car Procurement Financing

---

## 📌 Context (how it all started)

Initially, we already had a platform for **car buyouts**:

* working with dealers and private sellers
* quick car buyouts
* working capital - key growth constraint

The problem became apparent quite quickly:

> the business is limited not by demand, but by access to liquidity

Traditional financing sources:

* bank loans - slow and inflexible
* credit lines - limited and require collateral
* own capital - scales slowly

---

## 🎯 Goal

We needed to:

* ensure **scalable procurement financing**
* reduce the cost of capital
* accelerate decision-making
* automate risk management

---

## 💡 Solution: Investment Platform

We developed a platform that allows:

> attracting funds from individuals (investors) directly to finance loans to borrowers (in our case - for car procurements)

This is essentially **P2P / marketplace lending**, but:

* with deep scoring
* with full automation of the credit cycle
* with integration into a real business (car buyout)

---

## 🧩 Key Roles in the System

### 👤 Borrowers

* companies / car buyout operators
* submit financing applications
* receive funds for specific deals or asset pools

---

### 💼 Investors (individuals)

* place funds
* choose strategies (risk / return)
* earn income higher than bank deposits

---

### 🏦 Platform

* acts as an **infrastructure provider and risk operator**
* manages the process from application to repayment

---

## ⚙️ Key Platform Modules

---

### 1. 📥 Application Reception and Processing

* borrower submits application
* data normalization
* initial validation
* duplicate check

---

### 2. 🔍 Scoring and Checks

A key block that makes the platform competitive.

Integrations:

* credit bureaus
* anti-fraud systems
* legal entity verification
* beneficiary verification

Functions:

* credit rating calculation
* determination of financing limit
* risk classification of the deal

---

### 3. 🤖 AI Document Processing

* document upload (contracts, vehicle registration certificates, invoices)
* OCR + data extraction
* document correctness verification
* identification of discrepancies

---

### 4. 🧠 Decision-Making Module

* automatic approval / rejection
* credit policy configuration
* explainable scoring (transparency of decisions)

---

### 5. 💸 Investment Marketplace

* publication of applications/pools for investors
* automatic investment allocation
* strategy configuration:

* conservative
* balanced
* aggressive

---

### 6. 🔄 Loan Management

* fund disbursement
* payment schedule accounting
* interest accrual
* overdue monitoring

---

### 7. 💳 Repayment and Settlements

* payment reception
* income distribution to investors
* automatic loan closing

---

## 🏗 Solution Architecture

---

### 🧱 Microservices Structure

The platform was broken down into domains:

* Loan Origination Service
* Scoring & Risk Service
* Investor Service
* Marketplace Service
* Payment Service
* Document AI Service

Each service is:

* independent
* scalable
* has its own data model

---

### ☸️ Kubernetes

* containerization of all services
* horizontal scaling
* high availability

---

### 🧠 Process Orchestration (Temporal)

As in the credit conveyor, we used **Temporal**:

Each loan = workflow:

* application reception
* scoring
* publication to investors
* funding collection
* disbursement
* repayment

Advantages:

* fault tolerance
* retry logic
* state preservation
* full traceability

---

### 🔗 Integrations

* credit bureaus
* payment providers
* KYC/AML systems
* internal car platform systems

---

## 🔄 End-to-End Process

1. Borrower submits an application
2. System conducts scoring and checks
3. Application is published on the platform
4. Investors finance the loan
5. Funds are transferred to the borrower
6. Borrower repays the money with interest
7. Platform distributes income to investors

---

## 📈 Why it's more profitable than deposits

For investors:

* higher returns
* investment transparency
* risk diversification

For borrowers:

* faster than a bank
* flexible terms
* less bureaucracy

---

## 🚀 Key System Advantages

* full **automated lending cycle**
* reduced operational costs
* rapid financing scaling
* transparent risk management
* integration with real business (car buyout)

