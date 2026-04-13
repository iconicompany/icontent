---
title: "Supa - AI Platform for Event Management"
date: '2025-12-20'
description: "Development of an AI platform for event management"
tags: ["Fintech", "Microservices", "Temporal", "AI"]
authors: ["Iconicompany"]
language: "en"
startDate: "2025-02"
endDate: "2025-12"
team: "ai-hrtech"
teamLink: "/en/teams/ai-hrtech"
---

# 🎉 Supa - AI Platform for Event Management (UK)

### Workflow-driven system for event process management and automation

---

## 📌 Context and Challenge

The Supa project addresses a classic problem in the event industry:

* communication with suppliers is manual (email, messengers)
* contractor selection is chaotic
* date and price negotiation is a lengthy process
* information is fragmented (spreadsheets, emails, calendars)

Engineering task:

> to consolidate all event organization processes into a **single manageable system with AI automation**

---

## 🎯 System Goal

* automate interaction between participants
* accelerate supplier selection and terms negotiation
* reduce manual correspondence
* make the process **transparent, trackable, and reproducible**

---

## 🧠 Architectural Approach

### Core Principle:

> **AI-first + workflow orchestration + multi-tenant platform**

The system is built as:

* a set of domain services
* a unified AI assistant layer
* an event-driven interaction model

---

## 🧩 Key Modules

---

### 👤 1. User Accounts (Multi-role Accounts)

Support for various roles:

* event organizers
* suppliers (catering, venues, logistics)
* managers

Functionality:

* role-based access
* data isolation (multi-tenant)
* custom scenarios per role

---

### ✉️ 2. Communication Module (Messaging Engine)

Internal messaging system between accounts:

* organizer ↔ supplier dialogues
* communication history storage
* message status

---

### 🤖 AI Email Generation

Key feature:

* email generation based on request templates:

* date inquiry
* price inquiry
* service clarification
* adaptation to supplier context

Technically:

* LLM + prompt templates
* context = dialogue history + supplier profile

---

### 🧠 3. Manager AI Assistant (Core AI Layer)

Central component of the system.

Functions:

#### 📅 Date Availability Check

* supplier calendar analysis
* consideration of business rules (buffer, load)

---

#### 📌 Booking via Chat

* user types: "book for June 15th"
* system:

* validates slot
* creates event
* records booking

---

#### 🍽 Menu and Price Selection

* parsing supplier documentation
* extracting:

* menu
* prices
* recommendations based on budget

---

#### 🔍 Supplier Selection

* search by database
* filtering:

* price
* service type
* availability

---

## ⚙️ How it's Implemented

AI Assistant = orchestration layer:

* intent detection
* request routing
* calling domain services

---

### 📬 4. RFQ (Request for Quotation) Engine

Automation of quotation requests:

1. request is formed
2. sent to suppliers
3. responses are aggregated
4. best option is selected

---

### 📦 5. Supplier Booking

* recording the selected contractor
* date blocking
* link to event

---

### 📅 6. Event Calendar

Functionality:

* create / edit events
* display participants
* synchronization with bookings

Peculiarity:

> calendar = source of truth for the entire system

---

### 🚚 7. Logistics Calculation

* delivery cost calculation
* distance consideration
* integration with supplier rates

---

## 🏗 System Architecture

---

### 🧱 Microservice Structure

* Account Service
* Messaging Service
* AI Service
* Supplier Service
* Booking Service
* Calendar Service
* Pricing/Logistics Service

---

### 🔄 Event-Driven Model

* events:

* `message_sent`
* `supplier_selected`
* `booking_created`
* `event_updated`

Used for:

* service synchronization
* reactive logic

---

### 🧠 AI Layer

Separate service:

* LLM orchestration
* prompt management
* tool calling

---

## ⚙️ Process Orchestration

Approach analogous to fintech:

> each event = workflow

Example:

```text
Create Event →
Select Suppliers →
Request Quotes →
Compare →
Book →
Manage Event →
Close

