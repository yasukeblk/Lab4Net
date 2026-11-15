---
title: SSH remote access
name: How to log in to a router securely
mins: 8
---

## The problem: Telnet sends everything in clear text
<p>R1 accepts <b>Telnet</b> on TCP port 23 with one shared password. Telnet sends everything as plain text, including the password, so anyone who captures traffic on the path can read it. A shared password also means you cannot tell who logged in, and you cannot remove one person without changing it for everyone.</p><p><b>SSH</b> (Secure Shell), on TCP port 22, gives the same command line but encrypts the whole session. Combined with individual usernames, it fixes both problems.</p>

## How SSH protects the session
<ol><li>PC1 opens a TCP connection to R1 on port 22.</li><li>The two agree on encryption. R1 proves its identity with its <b>RSA key pair</b>: a public key it can share and a private key it keeps.</li><li>They build a shared session key, and from then on every byte is encrypted.</li><li>Only then does R1 ask for a username and password, so the password crosses the network encrypted.</li></ol><p>SSH version 2 is the one to use. Version 1 has known weaknesses.</p>

## What the router needs first
<ul><li>A <b>hostname</b> other than the default Router, and a <b>domain name</b> (<code>ip domain-name lab.local</code>). The key pair is named after both, as R1.lab.local, so IOS will not generate keys without them.</li><li>An <b>RSA key pair</b>: <code>crypto key generate rsa modulus 2048</code>. Generating keys is what switches the SSH server on. SSH version 2 needs a modulus of at least 768 bits; 2048 is the sensible size today.</li><li>A <b>local user</b>: <code>username admin privilege 15 secret S3cure-Pass</code>. <code>secret</code> stores the password as a hash, and privilege 15 puts the user straight into privileged EXEC mode.</li></ul>

## Locking the VTY lines
<p>Remote logins arrive on <b>VTY lines</b> (virtual terminal lines), here 0 to 4. Two commands there finish the job:</p><ul><li><code>login local</code> makes the lines ask for a username and check it against the local user database.</li><li><code>transport input ssh</code> allows only SSH. This is the line that actually closes Telnet; without it, Telnet keeps working.</li></ul><p><code>ip ssh version 2</code> stops the router accepting version 1.</p>

## Other ways in
<p>SSH is not the only way to manage a device. The <b>console port</b> needs a cable plugged into the device itself, so it works even when the network is down; it is the way back in if a remote setting locks you out. Some devices also offer a web page: <b>HTTP</b> is clear text like Telnet, while <b>HTTPS</b> is encrypted like SSH. In larger networks, usernames are kept on a central <b>TACACS+</b> or <b>RADIUS</b> server instead of on every device, so one account works everywhere and can be removed in one place.</p>

## Check it worked
<p>Test both halves. From PC1, <code>ssh -l admin 192.168.1.1</code> should ask for the password and log in, and <code>telnet 192.168.1.1</code> should be refused. On R1, <code>show ip ssh</code> shows whether SSH is enabled and which version, and <code>show ssh</code> lists the current SSH sessions.</p>

## @terms
- Telnet :: A remote login protocol on TCP port 23 that sends everything, including passwords, in clear text.
- SSH :: Secure Shell, an encrypted remote login protocol on TCP port 22.
- RSA key pair :: A public and private key the router uses to prove its identity and set up encryption.
- Modulus :: The size of the RSA key in bits. Larger is stronger.
- VTY lines :: The virtual lines that remote Telnet and SSH sessions connect to.
- login local :: Line setting that asks for a username and checks it against the local user database.
- transport input :: Line setting that lists which protocols may connect, such as ssh or telnet.

## @exam
- 4.8: configure network devices for remote access using SSH. 5.3: configure and verify device access control using local passwords.
- Ports: SSH is TCP 22, Telnet is TCP 23.
- The steps in order: hostname, domain name, local user, RSA keys, <code>ip ssh version 2</code>, then <code>login local</code> and <code>transport input ssh</code> on the VTY lines.
- <code>secret</code> stores a hash; <code>password</code> stores clear text unless service password-encryption is on, which is weak.
- 2.8 also lists console, HTTP and HTTPS access: console is local, and HTTPS, like SSH, is encrypted.

## @mistakes
- No domain name: <code>crypto key generate rsa</code> fails, and SSH never starts.
- <code>login</code> instead of <code>login local</code>: the line asks for the line password, not a username, and the admin account is never used.
- Forgetting <code>transport input ssh</code>: SSH works, but Telnet still works too.
- Setting <code>transport input ssh</code> before creating a user: nobody can log in remotely, and you need the console to recover.

## @quiz

### <code>crypto key generate rsa</code> fails with a message about a domain name. What is missing?
- ip ssh version 2
- [x] ip domain-name
- username admin
- transport input ssh
> The key pair is named hostname.domain, so IOS needs a domain name (and a hostname other than Router) before it will generate keys.

### SSH works on R1, but Telnet still works too. Which command is missing?
- login local
- ip ssh version 2
- [x] transport input ssh
- crypto key generate rsa
> transport input ssh limits the VTY lines to SSH. Without it they still accept Telnet.

### Which TCP ports do SSH and Telnet use?
- [x] SSH 22, Telnet 23
- SSH 23, Telnet 22
- SSH 443, Telnet 23
- SSH 22, Telnet 21
> SSH is 22 and Telnet is 23. 21 is FTP control and 443 is HTTPS.

### What does <code>login local</code> on the VTY lines do?
- Allows logins only from the local subnet
- Uses the enable secret as the login password
- Turns on SSH
- [x] Asks for a username and checks it against the local user database
> login local uses accounts created with username. Plain login would ask for a line password instead, with no username.

### Why is <code>username admin secret S3cure-Pass</code> better than using <code>password</code>?
- [x] secret stores the password as a hash, not as readable text
- secret enables SSH automatically
- secret gives privilege 15
- secret is required for Telnet
> secret stores a hash. password stores clear text unless service password-encryption is on, and that encryption is easily reversed.

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
  "label": "TELNET TCP 23",
  "bad": 1,
  "t": "Before: Telnet in clear text",
  "x": "PC1 runs telnet 192.168.1.1. The connection works, and the shared password crosses the link as readable text that anyone capturing traffic could see."
 },
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "TCP 22",
  "t": "PC1 opens SSH",
  "x": "After the change, PC1 runs ssh -l admin 192.168.1.1. It opens a TCP connection to R1 on port 22."
 },
 {
  "path": [
   "R1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "RSA KEY",
  "t": "R1 proves who it is",
  "x": "R1 sends its public key, from the 2048-bit pair generated as R1.lab.local. The two sides agree on SSH version 2 and build a shared session key."
 },
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "ENCRYPTED LOGIN",
  "t": "The login is encrypted",
  "x": "Only now does PC1 send the username admin and its password, inside the encrypted session. login local makes R1 check them against its user database."
 },
 {
  "path": [
   "R1",
   "PC1"
  ],
  "cls": "rep",
  "at": "PC1",
  "label": "R1#",
  "good": 1,
  "t": "Logged in",
  "x": "The credentials match, and privilege 15 puts admin straight into privileged EXEC mode. Every command and reply is encrypted."
 },
 {
  "path": [
   "PC1",
   "R1"
  ],
  "cls": "req",
  "at": "R1",
  "label": "REFUSED",
  "bad": 1,
  "t": "Telnet is now closed",
  "x": "PC1 tries telnet 192.168.1.1 again. transport input ssh allows only SSH on the VTY lines, so R1 refuses the connection."
 }
]
```
