# Critical Risk Assessment Template

**Purpose:** Non-sycophantic validation checkpoint before committing to technical specification. 
**When:** After Discovery (Phase 1), before Architecture (Phase 2).

---

## Instructions for AI

Before proceeding to technical specification, complete this assessment honestly. Do not minimize risks to please the user. The goal is to surface potential problems early when they're cheap to fix.

---

## Project: {Project Name}

**Assessment Date:** {Date}
**Assessed By:** {AI Model}

---

## 1. Technical Feasibility

### Can This Be Built?

| Aspect | Assessment | Risk Level |
|--------|------------|------------|
| Core technology exists | Yes/No/Partially | 🟢/🟡/🔴 |
| Within solo developer capability | Yes/No/Partially | 🟢/🟡/🔴 |
| Dependencies are stable/maintained | Yes/No/Partially | 🟢/🟡/🔴 |
| No unsolved technical problems | Yes/No/Partially | 🟢/🟡/🔴 |

### Technical Red Flags

- [ ] Requires technology that doesn't exist yet
- [ ] Depends on deprecated/unmaintained libraries
- [ ] Needs hardware/resources beyond scope
- [ ] Requires real-time performance that's hard to achieve
- [ ] Has scaling requirements that conflict with solo operation

**Technical Risk Summary:**
```
{Honest assessment of technical challenges}
```

---

## 2. Scope Assessment

### MVP Scope Check

| Question | Answer |
|----------|--------|
| Can MVP be built in 4-6 weeks? | Yes/No |
| Is scope clearly defined? | Yes/No |
| Are "nice-to-haves" separated from "must-haves"? | Yes/No |
| Is there a clear definition of "done"? | Yes/No |

### Scope Creep Risks

- [ ] Vague requirements that could expand indefinitely
- [ ] "Simple" features that hide complexity (e.g., "just add social features")
- [ ] User expectations exceed stated scope
- [ ] Integration requirements not fully understood

**Scope Risk Summary:**
```
{Honest assessment of scope risks}
```

---

## 3. Market & Timing Risks

### Does This Make Sense to Build?

| Question | Assessment |
|----------|------------|
| Is there proven demand? | Evidence: {describe} |
| Are there existing solutions? | Yes/No - {list competitors} |
| What's the differentiation? | {describe unique value} |
| Is timing right? | {market conditions} |

### Market Red Flags

- [ ] Solving a problem no one has
- [ ] Competing against well-funded incumbents with no clear advantage
- [ ] Market is declining or oversaturated
- [ ] Requires behavior change users won't make
- [ ] Regulatory/legal barriers not addressed

**Market Risk Summary:**
```
{Honest assessment of market viability}
```

---

## 4. Resource & Sustainability

### Can This Be Maintained?

| Resource | Available | Required | Gap |
|----------|-----------|----------|-----|
| Development time | {hours/week} | {estimate} | {delta} |
| Ongoing maintenance | {hours/month} | {estimate} | {delta} |
| Infrastructure cost | ${budget} | ${estimate} | {delta} |
| Third-party services | ${budget} | ${estimate} | {delta} |

### Sustainability Red Flags

- [ ] Requires more time than available
- [ ] Operating costs exceed potential revenue
- [ ] Depends on free tiers that may change
- [ ] Requires constant manual intervention
- [ ] Technical debt will compound faster than can be addressed

**Sustainability Risk Summary:**
```
{Honest assessment of long-term viability}
```

---

## 5. Known Unknowns

### What Don't We Know Yet?

| Unknown | Impact if Wrong | How to Resolve |
|---------|-----------------|----------------|
| {unknown 1} | {impact} | {resolution path} |
| {unknown 2} | {impact} | {resolution path} |
| {unknown 3} | {impact} | {resolution path} |

---

## 6. Recommendation

### Overall Risk Level

```
🟢 LOW RISK    - Proceed with confidence
🟡 MEDIUM RISK - Proceed with specific mitigations
🔴 HIGH RISK   - Reconsider scope or approach
⛔ NO-GO       - Fundamental issues must be resolved first
```

**This Project:** {🟢/🟡/🔴/⛔}

### If Proceeding, Mitigate These Risks:

1. **{Risk 1}:** {Mitigation strategy}
2. **{Risk 2}:** {Mitigation strategy}
3. **{Risk 3}:** {Mitigation strategy}

### If Not Proceeding, Consider:

1. **Alternative approach:** {suggestion}
2. **Reduced scope:** {what to cut}
3. **Different timing:** {when might be better}

---

## 7. User Acknowledgment

Before proceeding to technical specification:

- [ ] I understand the technical risks identified
- [ ] I accept the scope as defined (not expanded)
- [ ] I have realistic expectations about timeline
- [ ] I understand the ongoing maintenance requirements
- [ ] I want to proceed despite the identified risks

**User Response:** {Proceed / Revise Scope / Pause}

---

## Notes

```
{Any additional observations, concerns, or recommendations}
```
