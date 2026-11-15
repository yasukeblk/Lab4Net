---
title: Ansible and Terraform
name: How Ansible and Terraform manage configuration
topic: true
ccna: 6.6
mins: 9
---

## The problem: keeping many devices right
<p>Automation is more than a script that changes one setting. <b>Configuration management</b> tools keep many devices in a known, intended state. The intended configuration is written in text files, stored in version control such as Git, reviewed like code, and applied by the tool. This approach is called <b>infrastructure as code</b>.</p><p>The gain is that the files become the record of truth. If a device drifts, the tool can put it back. If a change breaks something, the previous version of the files shows exactly what to return to.</p>

## Ideas the tools share
<ul><li><b>Idempotent</b>: running the same task twice gives the same result as running it once. If a VLAN already exists, the tool reports no change instead of creating it again. That makes it safe to run the tool repeatedly.</li><li><b>Agent or agentless</b>: an <b>agent</b> is software installed on each managed device. Agentless tools connect using what the device already has, such as SSH or an API. Most network devices cannot run third-party agents, so agentless tools suit them.</li><li><b>Push or pull</b>: in a <b>push</b> model a central server sends changes out. In a <b>pull</b> model each device checks in and fetches its configuration.</li><li><b>Declarative</b> means you describe the end state you want. <b>Procedural</b> (imperative) means you list the steps to get there.</li></ul>

## Ansible
<p><b>Ansible</b>, from Red Hat, is <b>agentless</b> and uses a <b>push</b> model. It runs on a <b>control node</b> and connects to devices over <b>SSH</b> (or an API). It is written in Python.</p><ul><li>The <b>inventory</b> lists the devices to manage, often grouped, for example all access switches.</li><li>A <b>playbook</b> is a file written in <b>YAML</b>. It holds one or more plays, each made of <b>tasks</b> that run in order, top to bottom.</li><li>Each task calls a <b>module</b>, a piece of code that does one job, such as sending IOS configuration lines or gathering facts.</li><li><b>Templates</b> written in Jinja2 build per-device configuration from shared variables.</li></ul><p>A playbook is run with <code>ansible-playbook</code>. Because the tasks run in the order written, Ansible is usually described as procedural, although many of its modules are themselves idempotent.</p>

## Terraform
<p><b>Terraform</b>, from HashiCorp, is an infrastructure-as-code tool that is strongly <b>declarative</b>. You write configuration files in <b>HCL</b> (HashiCorp Configuration Language) describing the resources that should exist, and Terraform works out what to create, change or delete, and in what order.</p><ul><li><b>Providers</b> are plugins that let Terraform talk to a platform through its API: a cloud, a controller or a device family.</li><li>The <b>state file</b> records what Terraform has built, so it can compare the real world with the configuration.</li><li>The workflow is <code>terraform init</code> (get the providers), <code>terraform plan</code> (show what would change), <code>terraform apply</code> (make the changes) and, when finished, <code>terraform destroy</code>.</li></ul><p>Terraform is agentless and works through APIs. It is widely used for building cloud infrastructure, and increasingly for networks.</p>

## Choosing between them
<p>The two often work together. Terraform is strongest at <b>provisioning</b>: creating the infrastructure, such as cloud networks, virtual routers and firewall rules. Ansible is strongest at <b>configuring</b> what already exists, such as pushing interface and routing configuration to a fleet of switches over SSH.</p><p>Older exams also covered <b>Puppet</b> and <b>Chef</b>. Both are usually agent-based and pull-based, which is one reason they fit network devices less well than agentless tools.</p>

## A typical change, start to finish
<ol><li>An engineer edits the files: for example, adds VLAN 30 to the variables for the access switches.</li><li>The change is committed to Git and reviewed by a colleague, who can see exactly which lines changed.</li><li>The tool is run in a check mode first: <code>terraform plan</code>, or Ansible's check mode, to show what would change.</li><li>The tool applies the change to every device in the group.</li><li>Running it again reports no changes, which confirms every device now matches the files.</li></ol>

## @terms
- Infrastructure as code :: Defining infrastructure and configuration in version-controlled text files that a tool applies.
- Idempotent :: Running a task again gives the same result and makes no further change.
- Agentless :: Managing a device without installing software on it, using SSH or an API.
- Playbook :: An Ansible file in YAML that lists tasks to run against devices.
- Inventory :: The Ansible list of managed devices and their groups.
- Module :: The unit of Ansible code a task calls to do one job.
- HCL :: HashiCorp Configuration Language, used to write Terraform files.
- Provider :: A Terraform plugin that talks to one platform's API.
- State file :: Terraform's record of the resources it manages.

## @exam
- 6.6: recognize the capabilities of configuration management mechanisms, such as Ansible and Terraform.
- Ansible: agentless, push, SSH, YAML playbooks, inventory, modules, written in Python.
- Terraform: declarative, HCL files, providers, state file, plan then apply.
- Know what idempotent means and why it makes a tool safe to run again.
- Puppet and Chef are typically agent-based and pull-based, in contrast to Ansible.

## @mistakes
- Saying Ansible needs an agent on each switch: it does not, it connects over SSH from the control node.
- Mixing up the file formats: Ansible playbooks are YAML, Terraform files are HCL.
- Running <code>terraform apply</code> without reading the plan: a resource renamed in the files can be destroyed and recreated.
- Editing devices by hand after adopting the tool: the files no longer match reality, and the next run overwrites the manual change.

## @quiz

### Which statement describes Ansible?
- Agent-based and pull-based, with manifests in Ruby
- [x] Agentless and push-based, with playbooks in YAML
- Declarative, with files in HCL and a state file
- Agent-based, using SNMP to push changes
> Ansible pushes from a control node over SSH with no agent, and its playbooks are YAML. HCL and the state file belong to Terraform.

### A task to create VLAN 10 runs on a switch that already has VLAN 10. The tool reports no change. What property is this?
- [x] Idempotence
- Statelessness
- Encapsulation
- Redundancy
> An idempotent task checks the current state and only acts if it differs, so running it again changes nothing.

### What does <code>terraform plan</code> do?
- Installs the providers
- Deletes every resource it manages
- Pushes YAML playbooks to the devices
- [x] Shows what Terraform would change, without changing anything
> plan compares the configuration with the state and reports the changes. apply makes them, init installs providers and destroy removes resources.

### What is Terraform's state file for?
- It stores passwords for SSH logins
- It lists the tasks to run in order
- [x] It records which resources Terraform has built, so it can compare them with the configuration
- It holds the YAML inventory of devices
> The state file is how Terraform knows what already exists. Without it, Terraform could not work out what to add, change or remove.
