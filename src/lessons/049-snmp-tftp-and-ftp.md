---
title: SNMP, TFTP and FTP
name: How devices are monitored and files moved
topic: true
ccna: 4.4, 4.9
mins: 9
---

## The problems these solve
<p>A network team needs to know how its devices are doing without logging in to each one: is an interface down, is the CPU busy, how much traffic crossed a link. <b>SNMP</b> (Simple Network Management Protocol) answers that. A team also needs to move files to and from devices: back up a configuration, or load a new IOS image. <b>TFTP</b> and <b>FTP</b> do that.</p>

## SNMP: managers, agents and the MIB
<p>SNMP has two roles. The <b>manager</b> (often called the NMS, network management station) is the monitoring server. The <b>agent</b> is software on each router, switch or server that answers it.</p><p>Every value an agent can report is stored in its <b>MIB</b> (Management Information Base), a tree of variables. Each variable has an <b>OID</b> (object identifier), a dotted number such as 1.3.6.1.2.1.1.5 (the device name). The manager asks for OIDs, and the agent replies with their values.</p>

## SNMP messages and ports
<ul><li><b>Get</b>, <b>GetNext</b> and <b>GetBulk</b>: the manager reads values. GetBulk (v2c and later) fetches many at once.</li><li><b>Set</b>: the manager changes a value on the device.</li><li><b>Trap</b>: the agent tells the manager about an event without being asked, such as an interface going down. Traps are not acknowledged.</li><li><b>Inform</b>: like a trap, but the manager acknowledges it, so the agent can resend if it is lost.</li></ul><p>SNMP runs over UDP. The agent listens on <b>port 161</b> for Gets and Sets. The manager listens on <b>port 162</b> for traps and informs.</p>

## SNMP versions and security
<p><b>SNMPv1</b> and <b>SNMPv2c</b> use a <b>community string</b>, which works like a shared password and is sent in clear text. A community can be read-only (<code>ro</code>) or read-write (<code>rw</code>).</p><p><b>SNMPv3</b> adds real security: users instead of communities, <b>authentication</b> (proof the message came from that user and was not changed) and <b>encryption</b> (privacy). Its three levels are <code>noAuthNoPriv</code>, <code>authNoPriv</code> and <code>authPriv</code>. Only authPriv both authenticates and encrypts.</p><p>On IOS, <code>snmp-server community NAME ro</code> allows v2c reads, <code>snmp-server host</code> names the manager that receives traps, and <code>snmp-server enable traps</code> turns traps on.</p>

## TFTP: simple and unprotected
<p><b>TFTP</b> (Trivial File Transfer Protocol) uses <b>UDP port 69</b>. It has no login, no encryption and cannot list a directory: you must know the file name. It sends the file in small blocks, and waits for an acknowledgement of each block before sending the next. That makes it reliable but slow over long distances.</p><p>Because it is so small, TFTP is built into devices and boot loaders. <code>copy running-config tftp:</code> backs up a configuration, and <code>copy tftp: flash:</code> loads a new IOS image. The router prompts for the server address and file name.</p>

## FTP: logins and two connections
<p><b>FTP</b> (File Transfer Protocol) uses <b>TCP</b>, so it is reliable and better for large files. It needs a username and password, and it can list, rename and delete files.</p><p>FTP uses two connections. The <b>control connection</b> goes to <b>TCP port 21</b> and carries commands. A separate <b>data connection</b> carries the file. In <b>active mode</b> the server opens the data connection back to the client, from port 20. In <b>passive mode</b> the client opens it to a port the server chooses, which works better through firewalls and NAT.</p><p>FTP sends its password in clear text. On IOS, <code>ip ftp username</code> and <code>ip ftp password</code> set the login, then <code>copy ftp: flash:</code> works like the TFTP version. SFTP and SCP are the encrypted alternatives.</p>

## Upgrading IOS, in order
<ol><li>Check there is room: <code>show flash:</code> or <code>dir flash:</code>.</li><li>Copy the image from the TFTP or FTP server into flash.</li><li>Optionally check the file is intact with <code>verify /md5</code>.</li><li>Point the router at it with <code>boot system flash:</code> and the file name, then save the configuration.</li><li>Reload, and confirm the version with <code>show version</code>.</li></ol>

## @terms
- SNMP manager (NMS) :: The monitoring server that polls devices and receives their traps.
- SNMP agent :: Software on a network device that answers the manager and sends traps.
- MIB :: The tree of variables an agent can report or change.
- OID :: The dotted number that identifies one variable in the MIB.
- Trap :: An unrequested, unacknowledged alert sent from agent to manager.
- Inform :: An alert like a trap that the manager acknowledges.
- Community string :: The clear-text shared password used by SNMPv1 and v2c.
- TFTP :: A minimal file transfer protocol on UDP port 69 with no login.
- FTP :: A file transfer protocol on TCP with logins, using port 21 for control.

## @exam
- 4.4: explain the function of SNMP in network operations. 4.9: describe the capabilities and functions of TFTP/FTP in the network.
- SNMP uses UDP 161 on the agent (Get, Set) and UDP 162 on the manager (Trap, Inform).
- Only SNMPv3 offers authentication and encryption. v1 and v2c use clear-text community strings.
- Informs are acknowledged, traps are not. GetBulk and Inform arrived with v2c.
- TFTP: UDP 69, no authentication, no directory listing. FTP: TCP 21 for control, TCP 20 for data in active mode.

## @mistakes
- Using a read-write community when read-only is enough: anyone who sniffs the clear-text string can change the device.
- Expecting traps on port 161: the manager listens on 162, so a firewall that only allows 161 silently drops every trap.
- Calling TFTP secure because it is used for IOS images: it has no login and no encryption at all.
- Copying a new image without checking free space in flash: the copy fails part way, or an old image is deleted with nothing to boot.

## @quiz

### A router sends an alert to the NMS when an interface goes down and the NMS sends back an acknowledgement. Which SNMP message was it?
- Trap
- [x] Inform
- GetResponse
- Set
> An Inform is acknowledged by the manager, so the agent knows it arrived. A Trap carries the same kind of alert but nobody acknowledges it.

### Which SNMP version and level both authenticates and encrypts messages?
- SNMPv2c with a read-only community
- SNMPv3 authNoPriv
- SNMPv1 with a read-write community
- [x] SNMPv3 authPriv
> authPriv adds privacy (encryption) on top of authentication. authNoPriv proves who sent the message but leaves it readable, and v1 and v2c only have clear-text communities.

### Which statement about TFTP is true?
- [x] It uses UDP port 69 and has no username or password
- It uses TCP port 21 and requires a login
- It encrypts files in transit
- It can list the files on the server
> TFTP is deliberately minimal: UDP 69, no authentication, no encryption and no directory listing. TCP 21 and logins belong to FTP.

### On which port does an SNMP manager receive traps?
- UDP 161
- TCP 162
- [x] UDP 162
- UDP 69
> Agents listen on UDP 161 for Gets and Sets, and managers listen on UDP 162 for traps and informs. SNMP does not use TCP for these.

### Why does FTP passive mode work better than active mode through a firewall?
- Passive mode encrypts the data
- [x] In passive mode the client opens the data connection, so nothing has to come in from outside
- Passive mode uses UDP instead of TCP
- Passive mode uses only port 21
> In active mode the server connects back to the client, which a firewall or NAT usually blocks. In passive mode the client opens both connections outward.
