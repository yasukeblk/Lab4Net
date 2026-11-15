---
title: AI and machine learning in network operations
name: How AI and machine learning help run networks
topic: true
ccna: 6.4
mins: 8
---

## The problem: too much data
<p>A modern network produces a huge amount of operational data: interface counters, syslog messages, SNMP values, flow records, wireless client statistics. No person can read all of it. Problems hide in the noise, and by the time someone notices, users have already complained.</p><p><b>AI</b> (artificial intelligence) and <b>machine learning</b> help by finding patterns in that data, spotting what is unusual, and increasingly by answering questions in plain language. Using these tools to run IT operations is often called <b>AIOps</b>.</p>

## What machine learning is
<p>In ordinary software, a person writes the rules: if CPU is above 90 percent, raise an alarm. In <b>machine learning</b> (ML), the system learns patterns from data instead. The result is called a <b>model</b>.</p><ul><li><b>Supervised learning</b> trains on <b>labelled</b> examples, where the right answer is already known, such as past events marked as real faults or false alarms.</li><li><b>Unsupervised learning</b> finds structure in data with no labels, such as grouping similar devices or spotting values that do not fit.</li><li><b>Reinforcement learning</b> learns by trial and reward, improving actions over time.</li></ul><p>Models are only as good as the data they learn from. Poor or unrepresentative data gives poor results.</p>

## Predictive AI
<p><b>Predictive AI</b> uses historical and live data to forecast what is likely to happen or to recognise what is abnormal. In network operations it is used for:</p><ul><li><b>Baselining</b>: learning what normal looks like for this network at this time of day, instead of using one fixed threshold.</li><li><b>Anomaly detection</b>: flagging behaviour that differs from the baseline, such as a sudden rise in failed wireless logins.</li><li><b>Forecasting</b>: predicting when a link will run out of capacity or a component is likely to fail, so it can be fixed before users notice.</li><li><b>Root cause analysis</b>: linking many alarms that come from one underlying fault.</li></ul>

## Generative AI
<p><b>Generative AI</b> creates new content, such as text or code, in response to a <b>prompt</b>. It is usually built on a <b>large language model</b> (LLM) trained on very large amounts of text. In network operations it can:</p><ul><li>Answer questions about the network in plain language, such as which sites had the most problems last week.</li><li>Draft configurations, scripts or documentation.</li><li>Summarise long logs or troubleshooting output.</li></ul><p>Vendors, Cisco included, are building such assistants into their management platforms.</p>

## Limits and risks
<ul><li>Generative AI can produce answers that sound confident but are wrong, called <b>hallucinations</b>. A generated configuration must be reviewed and tested before it is applied.</li><li>Sending configurations or logs to an outside AI service may expose sensitive data, such as addresses, passwords or customer details.</li><li>Predictive models can raise false alarms or miss real problems if the network changes and the model is not retrained.</li></ul><p>The usual approach keeps a <b>human in the loop</b>: AI suggests and explains, and an engineer decides and approves the change.</p>

## Where it fits
<p>AI works on top of the automation and controller ideas in the rest of section 6. Controllers collect the data through their southbound connections and telemetry, AI finds the patterns, and the controller or automation tools carry out the fix. This joins up into a loop of collect, analyse, act and verify.</p><p>An example: users at one site report slow wireless. Instead of an engineer reading logs from every access point, the assurance tool has already noticed that failed client logins at that site rose well above their usual level, linked them to one overloaded authentication server, and shown the likely cause. A generative assistant can then explain the finding in plain language and suggest a fix, which the engineer checks before anything changes.</p>

## @terms
- Artificial intelligence :: Computer systems that perform tasks that normally need human judgement.
- Machine learning :: Systems that learn patterns from data to build a model, instead of following hand-written rules.
- Model :: What a machine learning system produces from its training data and then uses on new data.
- Predictive AI :: AI that forecasts outcomes or detects anomalies from past and current data.
- Generative AI :: AI that creates new content, such as text or configuration, from a prompt.
- Large language model :: A generative model trained on very large amounts of text.
- Baseline :: The learned picture of normal behaviour that new data is compared against.
- Hallucination :: A confident but wrong answer from a generative AI model.

## @exam
- 6.4: explain AI (generative and predictive) and machine learning in network operations.
- Predictive AI forecasts and detects anomalies from historical data. Generative AI creates new content from a prompt.
- Supervised learning uses labelled data. Unsupervised learning finds patterns in unlabelled data.
- Dynamic baselines replace fixed thresholds, which reduces false alarms.
- Generated output must be verified by a person before it is applied to the network.

## @mistakes
- Treating predictive and generative AI as the same thing: one forecasts and flags, the other writes new content.
- Pasting a generated configuration straight into production: a hallucinated command can break the network or open a security hole.
- Assuming a model stays accurate for ever: when the network changes, the baseline must be relearned.
- Sending real configurations with secrets to a public AI service without approval: that can leak passwords and addresses.

## @quiz

### A tool learns normal traffic levels for each link and alerts when a link behaves unusually. What kind of AI is this?
- Generative AI
- [x] Predictive AI
- A large language model writing configuration
- Manual threshold alerting
> Learning a baseline and detecting anomalies is predictive AI. Generative AI creates new content, and a fixed threshold is not learning at all.

### An engineer asks an assistant to write an OSPF configuration for a new branch. What kind of AI is doing this?
- Unsupervised learning
- Predictive AI
- [x] Generative AI
- Anomaly detection
> Creating new text, such as configuration, from a prompt is generative AI. The output must still be checked before use.

### What is the difference between supervised and unsupervised learning?
- Supervised needs a person watching it run
- Unsupervised only works on wireless data
- Supervised learning cannot be used for networks
- [x] Supervised trains on labelled examples, unsupervised finds patterns in unlabelled data
> The difference is the training data. Labelled examples mean the right answer is known in advance. Unsupervised learning has to find structure on its own.

### Why should generated configuration be reviewed before it is applied?
- [x] Generative AI can produce wrong output that looks correct
- Generative AI only produces JSON
- Configurations created by AI cannot be saved
- Review is only needed for predictive AI
> Generative models can hallucinate commands or settings. A human review and a test keep a confident but wrong answer off the production network.
