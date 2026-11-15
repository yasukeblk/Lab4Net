---
title: Locking down device access
name: How to secure logins on a router
mins: 9
---

## The problem: anyone can log in
<p>R1 was left with shared passwords stored as readable text and Telnet open to every subnet. Anyone who sees the config learns the passwords, and anyone on the user LAN can try them. Nobody can tell who logged in, because everyone shares one password.</p><p>Securing device access means answering four questions: <b>who</b> may log in, <b>how</b> (which protocol), <b>from where</b>, and <b>for how long</b>.</p>

## Passwords that cannot be read
<p>IOS stores passwords in different ways, shown by a type number in the config:</p><ul><li><b>Type 0</b>: clear text. Anyone reading the config can see it.</li><li><b>Type 7</b>: what <code>service password-encryption</code> produces for line and <code>enable password</code> passwords. It stops someone reading over your shoulder, but it is easily reversed.</li><li><b>Type 5</b> (MD5), and on newer software types 8 and 9: one-way hashes, used by <code>enable secret</code> and <code>username ... secret</code>. They cannot simply be decoded.</li></ul><p>If both <code>enable password</code> and <code>enable secret</code> exist, the secret wins. Remove the old one with <code>no enable password</code> so it is not left lying in the config.</p>

## Who: individual accounts
<p><code>username admin privilege 15 secret Adm1n-Pass</code> creates a local account. Privilege 15 is full access, straight into privileged EXEC mode. Personal accounts mean every login can be traced to a person, and one person leaving means deleting one account, not changing a shared password.</p><p><code>login local</code> on a line makes it ask for a username and password from this list. In this lab it goes on both the VTY lines and the console. The console is physical access and deserves the same rules.</p>

## How and for how long
<p><code>transport input ssh</code> on the VTY lines refuses Telnet, which sends credentials in clear text. SSH encrypts them.</p><p><code>exec-timeout 5 0</code> ends a session after 5 minutes and 0 seconds with no input. The default is 10 minutes, and <code>exec-timeout 0 0</code> turns the timeout off, which is a bad idea on any line people can walk away from.</p>

## From where: access-class
<p>A <b>standard ACL</b> matches only the source address, which is exactly the question here. ACL 10, <code>permit 192.168.10.0 0.0.0.255</code>, matches the admin subnet. Everything else hits the <b>implicit deny</b> at the end of every ACL.</p><p><code>access-class 10 in</code> applies it to the VTY lines, not to an interface. It filters who may open a session to the router, whichever of the router's addresses they connect to. User traffic passing through R1 is not affected.</p><p>Finally, all of this is in the running config, in RAM. <code>copy running-config startup-config</code> saves it, or a reload undoes the work.</p>

## Check it worked
<ol><li><code>show running-config</code>: no readable passwords, and a type 5 or similar hash for the secrets.</li><li>SSH from ADMIN as admin works.</li><li>SSH from PC1 is refused. <code>show access-lists</code> shows the match counters.</li><li><code>show startup-config</code> contains the same settings.</li></ol>

## @terms
- enable secret :: The password for privileged EXEC mode, stored as a one-way hash. Overrides enable password.
- service password-encryption :: Turns clear-text passwords in the config into type 7, which hides them from view but is reversible.
- Privilege level 15 :: Full administrative access. Level 1 is user EXEC.
- exec-timeout :: How long an idle session stays open, in minutes and seconds. Default 10 minutes.
- access-class :: Applies an ACL to VTY lines to control who may open remote sessions.
- Standard ACL :: An ACL that matches only the source IP address. Numbered 1 to 99 or 1300 to 1999.
- Implicit deny :: The invisible deny everything at the end of every ACL.

## @exam
- 5.3: configure and verify device access control using local passwords. 4.8: configure network devices for remote access using SSH.
- Type 7 is reversible; enable secret and username secret are hashed.
- If enable password and enable secret are both set, enable secret is used.
- <code>access-class</code> applies an ACL to VTY lines; <code>ip access-group</code> applies one to an interface.
- <code>exec-timeout</code> takes minutes then seconds; the default is 10 minutes, 0 0 disables it.

## @mistakes
- Applying the VTY ACL with <code>ip access-group</code> under the line, or forgetting the admin subnet in it: either the filter does nothing or you lock yourself out.
- Using <code>username admin password</code> instead of <code>secret</code>: the password is stored reversibly.
- Hardening the VTY lines but leaving the console with no login.
- Not saving: after a reload the old clear-text passwords and Telnet come back.

## @quiz

### Which password storage is reversible and should not be relied on alone?
- enable secret
- username ... secret
- [x] Type 7, from service password-encryption
- Type 9
> Type 7 only hides passwords from casual view and is easily decoded. The secret forms are one-way hashes.

### Both <code>enable password</code> and <code>enable secret</code> are configured with different values. Which one works?
- enable password
- [x] enable secret
- Either one
- Neither, until one is removed
> enable secret takes precedence. The old enable password should still be removed so it is not left in the config.

### How do you allow only 192.168.10.0/24 to open SSH sessions to R1?
- [x] A standard ACL applied to the VTY lines with access-class in
- A standard ACL applied to G0/1 with ip access-group in
- transport input ssh on G0/0
- An extended ACL on the console line
> access-class filters sessions to the VTY lines themselves. An interface ACL would also affect traffic passing through and only covers that one interface.

### What does <code>exec-timeout 5 0</code> do?
- Locks the line for 5 minutes after a failed login
- [x] Closes a session after 5 minutes with no input
- Allows 5 login attempts
- Delays the login prompt by 5 seconds
> The arguments are minutes and seconds of idle time. 0 0 would disable the timeout.

### After hardening R1, the router reloads and Telnet works again. What was missed?
- service password-encryption
- [x] copy running-config startup-config
- login local
- exec-timeout
> All changes live in the running config until they are saved. A reload loads startup-config, which still had the old settings.

## @story
```json
[
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "TELNET OPEN",
  "bad": 1,
  "t": "Before: anyone, any protocol",
  "x": "From the user subnet, PC1 can Telnet to R1 and type the shared password. Anyone capturing the traffic can read that password too."
 },
 {
  "path": [
   "ADMIN",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "SSH",
  "t": "SSH from the admin subnet",
  "x": "ADMIN opens SSH to 192.168.10.1. Source 192.168.10.10 matches ACL 10, so access-class lets the session start."
 },
 {
  "path": [
   "R1",
   "ADMIN"
  ],
  "cls": "rep",
  "at": "ADMIN",
  "label": "USERNAME",
  "good": 1,
  "t": "Personal login",
  "x": "login local asks for a username and password. admin with Adm1n-Pass is checked against the hashed secret, and privilege 15 gives full access."
 },
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "ACL 10 DENY",
  "bad": 1,
  "t": "User subnet refused",
  "x": "PC1 at 192.168.20.10 tries SSH. ACL 10 has no permit for it, so the implicit deny refuses the session before a login prompt appears."
 },
 {
  "path": [
   "R1",
   "ADMIN"
  ],
  "cls": "rep",
  "at": "ADMIN",
  "label": "TIMED OUT",
  "t": "Idle session closed",
  "x": "If the admin walks away, exec-timeout 5 0 closes the session after 5 minutes without input, so nobody can use it."
 }
]
```
