---
title: NTP and syslog
name: Why every device needs the same clock
mins: 8
---

## The problem: logs nobody can line up
<p>When a link fails, you want to read what each device saw, in order. That only works if every device agrees on the time. A Cisco router keeps its own clock, and after a reload it may start from a default date in 1993. In <code>show clock</code>, a <b>*</b> in front of the time means the router does not trust its own clock.</p><p>Two services fix this together. <b>NTP</b> (Network Time Protocol) sets every clock from one source. <b>Syslog</b> sends each device's log messages to one server, so they can be read side by side.</p>

## How NTP works
<p>NTP runs over <b>UDP port 123</b>. A client asks a server for the time, measures how long the answer took to arrive, and corrects its clock gradually.</p><p>Distance from a real reference clock is called the <b>stratum</b>. NTP1 takes its time from GPS, so it is stratum 1. R1 learns from NTP1 and becomes stratum 2. R2 also points at NTP1 (its packets are routed through R1), so it is stratum 2 as well. A device that is not synchronised reports stratum 16. A router can also be a server for others: in client mode it only takes time, and with <code>ntp master</code> it gives out its own.</p>

## Syslog messages and severity levels
<p>A Cisco log message looks like <code>%LINK-3-UPDOWN</code>: the <b>facility</b> (the part of the system that raised it), the <b>severity</b>, and a short name. There are eight severities, and lower is worse:</p><ol><li>0 emergencies, 1 alerts, 2 critical</li><li>3 errors, 4 warnings</li><li>5 notifications, 6 informational, 7 debugging</li></ol><p>Syslog travels over <b>UDP port 514</b>. It is fire and forget: if the path to the server is down, the message is simply lost.</p>

## Choosing what gets sent
<p>A level setting means "this level and everything more serious". <code>logging trap warnings</code> sends levels 0 to 4 to the server. The default trap level is informational (6), which would send almost everything.</p><p>The local buffer, read with <code>show logging</code>, keeps its own copy regardless of the trap level. That matters in this lab: when R2 shuts its only link, its "down" messages cannot reach LOG1 at all.</p>

## How it is set up here
<p>On both routers: <code>ntp server 192.168.1.50</code> makes them clients of NTP1. <code>service timestamps log datetime msec</code> stamps each message with the date and time to the millisecond, instead of the router's uptime. <code>logging host 192.168.1.60</code> names LOG1, and <code>logging trap warnings</code> sets the filter.</p>

## Check it worked
<p><code>show ntp associations</code> lists the servers, with a <b>*</b> beside the one the router is synchronised to. <code>show ntp status</code> should say synchronised, stratum 2. Note the two different stars: in <code>show clock</code> a * is bad, in the associations list it is good. Synchronisation can take a minute or more.</p>

## @terms
- NTP :: Network Time Protocol. Sets device clocks from a time server over UDP 123.
- Stratum :: How many steps a clock is from a reference source. 1 is closest; 16 means not synchronised.
- Syslog :: A standard way to send log messages to a central server, over UDP 514.
- Severity level :: A number from 0 (emergencies) to 7 (debugging). Lower is more serious.
- Facility :: The part of the system that produced a message, such as LINK or LINEPROTO.
- Trap level :: The least serious severity a device sends to its syslog server.
- Logging buffer :: A copy of recent messages kept in the device's own memory, read with show logging.

## @exam
- 4.2: configure and verify NTP operating in client and server mode. 4.5: describe the use of syslog features including facilities and severity levels.
- Know all eight severity levels in order, with their numbers. A level setting includes that level and every lower number.
- Ports: NTP UDP 123, syslog UDP 514.
- <code>ntp server</code> makes a device a client; <code>ntp master</code> makes it an authoritative source.
- Read a message name: in <code>%LINK-3-UPDOWN</code>, 3 is the severity (errors).

## @mistakes
- Expecting <code>logging trap warnings</code> to send only warnings: it sends 0 to 4.
- Forgetting <code>service timestamps log datetime</code>: messages show uptime, which cannot be compared between devices.
- Judging NTP straight after configuring it: synchronisation takes a while, so <code>show ntp status</code> says unsynchronised at first.
- No route to the NTP or syslog server: nothing arrives and nothing on the router warns you.

## @quiz

### A router is configured with <code>logging trap warnings</code>. Which messages reach the syslog server?
- Only severity 4
- Severities 4 to 7
- [x] Severities 0 to 4
- Severities 0 to 3
> A level includes itself and everything more serious, and lower numbers are more serious. Warnings is 4, so 0 to 4 are sent.

### R1 learns its time from a stratum 1 GPS server. What stratum does R1 report?
- 1
- [x] 2
- 0
- 16
> Each step away from the reference adds one. Stratum 16 means unsynchronised.

### Which transport and port does syslog use by default?
- TCP 514
- UDP 123
- UDP 69
- [x] UDP 514
> Syslog is UDP 514. UDP 123 is NTP and UDP 69 is TFTP.

### A message reads <code>%LINEPROTO-5-UPDOWN</code>. What does the 5 mean?
- [x] Severity 5, notifications
- Interface number 5
- Facility number 5
- Severity 5, errors
> The number between the facility and the name is the severity. 5 is notifications; errors is 3.

### <code>show clock</code> on a router shows <b>*</b> before the time. What does that tell you?
- The router is the NTP master
- [x] The clock is not authoritative, so it is not synchronised
- The time is in UTC
- NTP is synchronised
> In show clock a star means the time is not trusted. In show ntp associations a star marks the server in use, which is good news.

## @story
```json
[
 {
  "path": [
   "R2",
   "R1",
   "SW1",
   "NTP1"
  ],
  "cls": "req",
  "at": "NTP1",
  "label": "NTP UDP 123",
  "t": "R2 asks for the time",
  "x": "R2 sends an NTP request to 192.168.1.50. It crosses R1 like any other routed packet."
 },
 {
  "path": [
   "NTP1",
   "SW1",
   "R1",
   "R2"
  ],
  "cls": "rep",
  "at": "R2",
  "label": "STRATUM 2",
  "good": 1,
  "t": "R2 synchronises",
  "x": "NTP1 answers with stratum 1 time from GPS. R2 corrects its clock and becomes stratum 2, one step from the reference."
 },
 {
  "path": [
   "R1",
   "R2"
  ],
  "cls": "req",
  "at": "R2",
  "label": "LINK-5-CHANGED",
  "t": "R2 G0/1 is shut down",
  "x": "R2 logs an administrative shutdown at severity 5, notifications. It goes into the local buffer, but the trap level of warnings keeps it from LOG1."
 },
 {
  "path": [
   "R1",
   "SW1",
   "LOG1"
  ],
  "cls": "req",
  "at": "LOG1",
  "label": "LINK-3-UPDOWN",
  "good": 1,
  "t": "R1 reports a link down",
  "x": "R1 saw its link drop without anyone touching it, an error at severity 3. That passes the warnings filter and reaches LOG1 on UDP 514, with an accurate timestamp."
 },
 {
  "path": [
   "R2",
   "R1"
  ],
  "cls": "req",
  "at": "R2",
  "label": "LOST",
  "bad": 1,
  "t": "R2 cannot report",
  "x": "R2's path to LOG1 was the link that just went down, so nothing it logs now can leave. Only its local buffer keeps the record."
 }
]
```
