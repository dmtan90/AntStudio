# 🌲 Multi-Repo (Open Core) Management Guide

This guide explains how to manage two repositories (Public & Private) using **Git Subtree**. This allows you to treat the Public repo as a folder within your Private repo, making it easy to share code while protecting Pro features.

## 🏗️ The Architecture

- **GitHub Public**: `https://github.com/your-org/antstudio-core`
- **GitHub Private**: `https://github.com/your-org/antstudio-pro`

In this setup, the **Private Repo** is your primary workspace. The **Public Repo** lives inside it as a subdirectory (e.g., `/core`).

---

## 🛠️ Phase 1: Initial Setup

### 1. In your Private Repo
Register the Public repository as a remote:
```bash
git remote add public https://github.com/your-org/antstudio-core.git
```

### 2. Add the Public code as a Subtree
This command takes the `main` branch of the Public repo and puts it into a folder named `core`:
```bash
git subtree add --prefix core public main --squash
```
*Note: `--squash` keeps your history clean by combining all public commits into one.*

---

## 🔄 Phase 2: Daily Workflow

### Scenario A: You fixed a bug in the Public code (within the `core/` folder)
If you fixed something in `core/` while working in your Private repo, you can push that fix back to the Public community:
```bash
git subtree push --prefix core public main
```

### Scenario B: The Community fixed a bug in the Public repo
To bring those fixes into your Private Pro version:
```bash
git subtree pull --prefix core public main --squash
```

---

## 💡 Best Practices for AntStudio

### 1. Structure
Move shared logic (Models, Core Utils, Basic Routes) into the `core/` folder.
Keep Pro logic (AI Advanced providers, Stripe integration, Viral Testing) in the root or a `pro/` folder.

### 2. Code Organization (IoC)
Use classes and inheritance to avoid copy-pasting code:
```typescript
// core/services/BaseAIService.ts (Public)
export class BaseAIService {
  generateText() { ... }
}

// services/ProAIService.ts (Private)
import { BaseAIService } from '../core/services/BaseAIService';
export class ProAIService extends BaseAIService {
  generateVideoViralHooks() { ... } // High-value feature
}
```

### 3. CI/CD Protection
Ensure your Build/Deploy pipeline only pulls from the Private repo for Pro customers, and the Public repo remains a "lite" version.

---

## ⚠️ Important Precautions
- **Never** put Pro secrets or Pro code inside the `core/` directory.
- **Always** run your tests before doing a `subtree push` to ensure no Private imports accidentally leaked into the Core code.
