---
title: TCP and UDP
name: When to use TCP and when to use UDP
topic: true
ccna: 1.5
mins: 8
---

## What the transport layer adds
<p>IP gets a packet to the right <b>host</b>. It does not say which <b>application</b> on that host should get it, and it does not promise the packet arrives. The transport layer (Layer 4) fills those gaps. It has two main protocols: <b>TCP</b> (Transmission Control Protocol) and <b>UDP</b> (User Datagram Protocol).</p>

## Ports pick the application
<p>Both TCP and UDP use <b>port numbers</b> (0 to 65535). A server listens on a known port, for example 443 for HTTPS. The client picks a random high <b>ephemeral</b> port as its source. The pair of address and port at each end identifies one conversation, so a PC can hold many sessions to the same server at once.</p><p>Ports 0 to 1023 are the <b>well-known</b> ports, used by standard services.</p>

## TCP: reliable and ordered
<p>TCP is <b>connection-oriented</b>. Before any data moves, the two ends set up a session with the <b>three-way handshake</b>:</p><ol><li>The client sends <b>SYN</b> (synchronise), with its starting sequence number.</li><li>The server replies <b>SYN-ACK</b>: its own sequence number, and an acknowledgement of the client's.</li><li>The client sends <b>ACK</b>. The session is open.</li></ol><p>Every byte then has a <b>sequence number</b>. The receiver sends back <b>acknowledgements</b>. Anything not acknowledged in time is <b>retransmitted</b>, and the receiver puts segments back in order. <b>Windowing</b> lets the receiver say how much data it can take before the sender must wait for an acknowledgement, which is TCP's flow control. The session is closed with FIN messages.</p>

## UDP: light and fast
<p>UDP is <b>connectionless</b>. There is no handshake, no sequence numbers, no acknowledgements and no retransmission. Its header is 8 bytes, against at least 20 bytes for TCP. If a datagram is lost, UDP does nothing about it; the application decides whether to care.</p><p>That suits traffic where a late packet is useless anyway. A voice or video call would rather skip a lost moment than wait for a resend. It also suits short question-and-answer exchanges such as DNS lookups, where the application can simply ask again.</p>

## Which uses which
<ul><li><b>TCP</b>: HTTP 80, HTTPS 443, SSH 22, Telnet 23, FTP 20 and 21, SMTP 25.</li><li><b>UDP</b>: DHCP 67 and 68, TFTP 69, NTP 123, SNMP 161 and 162, syslog 514, voice and video media.</li><li><b>DNS</b>: port 53, normally UDP for queries, and TCP for large responses and zone transfers.</li></ul><p>The rule of thumb: if every byte must arrive intact and in order, as with a file or a web page, use TCP. If speed matters more than perfection, or the exchange is one small packet each way, use UDP.</p>

## Reliability in action
<ol><li>A PC downloads a file over TCP. The server sends four segments in a row, because the PC's window allows that much before an acknowledgement is needed.</li><li>The third segment is lost on the way. The PC receives the first, second and fourth.</li><li>The PC acknowledges only up to the end of the second segment, which tells the server where the gap starts. It holds the fourth segment rather than passing it to the application out of order.</li><li>The server resends the third segment. The PC now has everything, acknowledges up to the end of the fourth, and hands the data to the application in the right order.</li></ol><p>With UDP the same loss would simply leave a gap. Nothing in the protocol notices it.</p>

## Side by side
<ul><li><b>Session</b>: TCP opens one with a handshake; UDP just sends.</li><li><b>Delivery</b>: TCP acknowledges and resends; UDP is best effort.</li><li><b>Order</b>: TCP reorders by sequence number; UDP passes datagrams up as they arrive.</li><li><b>Flow control</b>: TCP uses windowing; UDP has none.</li><li><b>Overhead</b>: TCP has a larger header and extra messages; UDP has an 8-byte header and nothing else.</li></ul>

## Seeing it on a device
<p>On a PC, <code>netstat -an</code> lists open TCP and UDP sessions with local and remote ports. On a Cisco router, <code>show tcp brief</code> lists TCP sessions to the device itself, such as an SSH login, and <code>show control-plane host open-ports</code> lists the ports it is listening on.</p>

## @terms
- Port number :: A 16-bit number that identifies the application a segment belongs to.
- Ephemeral port :: A temporary high port a client picks as its source for one session.
- Three-way handshake :: SYN, SYN-ACK, ACK: the exchange that opens a TCP session.
- Sequence number :: A TCP counter that numbers the bytes sent, so the receiver can reorder and detect loss.
- Acknowledgement :: A TCP message confirming which data has arrived.
- Windowing :: TCP flow control: the receiver says how much data may be sent before an acknowledgement.
- Connectionless :: Sending without first setting up a session, as UDP does.

## @exam
- 1.5: compare TCP to UDP.
- TCP: connection-oriented, three-way handshake, sequencing, acknowledgements, retransmission, windowing (flow control). UDP: none of these.
- UDP header 8 bytes; TCP header at least 20 bytes.
- Know the common ports and which protocol each uses: DHCP 67/68 UDP, TFTP 69 UDP, SNMP 161 UDP, syslog 514 UDP, NTP 123 UDP, SSH 22 TCP, HTTPS 443 TCP.
- Voice and video use UDP because retransmitted audio would arrive too late to be useful.

## @mistakes
- Saying UDP is unreliable so it is worse: it is chosen on purpose where speed and low overhead matter more.
- Writing an ACL that permits DNS only on TCP 53: ordinary lookups use UDP 53 and fail.
- Mixing up TFTP and FTP: TFTP uses UDP 69 with no login; FTP uses TCP 20 and 21.
- Thinking the client uses the well-known port too: the client uses a random ephemeral port; only the server side is well known.

## @quiz

### What is the correct order of the TCP three-way handshake?
- SYN, ACK, SYN-ACK
- ACK, SYN, SYN-ACK
- [x] SYN, SYN-ACK, ACK
- SYN, SYN, ACK
> The client sends SYN, the server answers SYN-ACK, and the client confirms with ACK. Only then does data flow.

### Why does voice traffic use UDP rather than TCP?
- [x] A retransmitted voice packet would arrive too late to be played, so recovery is pointless
- UDP encrypts the audio
- UDP guarantees delivery in order
- TCP cannot carry more than one call at a time
> Real-time audio cannot wait for resends. UDP's low overhead and lack of retransmission suit it; a small loss is barely heard.

### Which TCP feature lets a receiver limit how much data the sender may send before waiting for an acknowledgement?
- Sequencing
- [x] Windowing
- The checksum
- The three-way handshake
> Windowing is TCP's flow control. Sequence numbers handle order and loss detection, not the amount in flight.

### Which of these services runs over UDP?
- SSH
- HTTPS
- Telnet
- [x] TFTP
> TFTP uses UDP port 69. SSH (22), HTTPS (443) and Telnet (23) all run over TCP.

### A PC opens two browser tabs to the same web server. How does it keep the two sessions apart?
- Each tab uses a different server port
- [x] Each session has a different client source port
- Each tab uses a different IP address
- TCP sends both on one session
> The client picks a different ephemeral source port for each session. The server port (443) stays the same.
