---
title: DNS: names to addresses
name: How names become addresses
topic: true
ccna: 4.3
mins: 8
---

## The problem DNS solves
<p>Devices talk to IP addresses. People remember names. <b>DNS</b> (Domain Name System) is the service that turns a name such as www.example.com into an address such as 203.0.113.10.</p><p>It runs before almost everything else a user does. That is why a DNS fault looks like "the internet is down" even when every link and route is fine.</p>

## How a lookup works
<ol><li>The application asks the operating system for the address of a name.</li><li>The host checks its own <b>cache</b> and its local <b>hosts file</b>. If the answer is there, it stops.</li><li>Otherwise it sends a query to its configured <b>DNS server</b>, also called a resolver. The host learned that server address from DHCP or from manual settings.</li><li>If the resolver does not know the answer, it asks other servers on the host's behalf: a root server, then the server for .com, then the server for example.com.</li><li>The resolver returns the answer and keeps a copy.</li></ol><p>Each answer carries a <b>TTL</b>, the time it may be cached. Until it runs out, the same question is answered from memory.</p>

## Record types
<p>A DNS server stores <b>records</b>. The ones to know:</p><ul><li><b>A</b>: a name to an IPv4 address.</li><li><b>AAAA</b>: a name to an IPv6 address.</li><li><b>CNAME</b>: an alias that points one name at another name.</li><li><b>MX</b>: the mail server for a domain.</li><li><b>NS</b>: the name servers that hold a domain's records.</li><li><b>PTR</b>: the reverse, an address to a name.</li></ul>

## Ports
<p>DNS uses port <b>53</b>. Ordinary queries use <b>UDP</b>, because one small question and one small answer do not need a connection. <b>TCP</b> port 53 is used when an answer is too large for one UDP message, and for copying whole zones between servers.</p><p>If an ACL has to let DNS through, it needs to permit UDP 53, and usually TCP 53 as well.</p>

## DNS on a Cisco device
<p>A router or switch can be a DNS <b>client</b>, so that you can type names in commands such as <code>ping</code>:</p><ul><li><code>ip name-server 8.8.8.8</code> tells it which server to ask.</li><li><code>ip domain-lookup</code> turns name lookups on. It is on by default.</li><li><code>ip domain-name example.com</code> sets the domain added to short names. SSH key generation also needs it.</li><li><code>ip host SRV1 192.168.10.10</code> adds a local name, like an entry in a hosts file.</li></ul><p>With lookups on and no server set, a mistyped command is treated as a host name and the console waits while it tries to resolve it. Many people turn that off in a lab with <code>no ip domain-lookup</code>.</p>

## How DHCP and DNS fit together
<p>The two services do different jobs. <b>DHCP</b> gives a host its address, mask, default gateway and the address of a DNS server. <b>DNS</b> then answers name questions. In a DHCP pool the command is <code>dns-server</code>.</p><p>A host with a correct address and gateway but a wrong DNS server can ping 8.8.8.8 but cannot open a website by name.</p>

## Checking it works
<p>On a PC, <code>nslookup www.example.com</code> asks the configured server and shows the answer and which server gave it. <code>ipconfig /all</code> shows which DNS servers the PC is using.</p><p>The quick test for any "cannot reach it" report: ping by <b>address</b>, then ping by <b>name</b>. If the address works and the name does not, the network is fine and the fault is DNS. On a router, <code>show hosts</code> lists the name servers and cached names.</p>

## @terms
- DNS :: Domain Name System: the service that maps names to IP addresses.
- Resolver :: The DNS server a host is configured to ask; it finds the answer on the host's behalf.
- A record :: A DNS record mapping a name to an IPv4 address.
- AAAA record :: A DNS record mapping a name to an IPv6 address.
- CNAME :: A DNS record that makes one name an alias of another.
- TTL :: In DNS, how long an answer may be kept in a cache.
- Hosts file :: A local list of names and addresses a host checks before asking a DNS server.

## @exam
- 4.3: explain the role of DHCP and DNS within the network.
- DNS uses port 53: UDP for normal queries, TCP for large answers and zone transfers.
- A record is IPv4, AAAA is IPv6, CNAME is an alias, MX is mail, PTR is address to name.
- <code>ip name-server</code> sets the server a Cisco device asks. <code>ip domain-lookup</code> is on by default.

## @mistakes
- Blaming routing when only names fail. If a ping to an address works and a ping to a name does not, look at DNS.
- Leaving the <code>dns-server</code> line out of a DHCP pool. Clients get an address and a gateway but cannot resolve any name.
- Permitting only TCP 53 or only UDP 53 in an ACL. Most queries are UDP, but some answers need TCP.

## @quiz

### Which DNS record maps a name to an IPv6 address?
- A
- CNAME
- [x] AAAA
- PTR
> AAAA holds an IPv6 address. A is the IPv4 version, CNAME is an alias and PTR maps an address back to a name.

### A user can ping 8.8.8.8 but cannot open any website by name. What is the most likely cause?
- The default gateway is wrong
- [x] The PC has no working DNS server
- The switch port is in the wrong VLAN
- NAT is not configured
> Reaching 8.8.8.8 proves the address, gateway, routing and NAT all work. Only name resolution is failing, so check the DNS server setting.

### Which transport and port does a normal DNS query use?
- [x] UDP 53
- TCP 23
- UDP 67
- TCP 443
> DNS queries use UDP port 53. TCP 53 is also used, for large answers and zone transfers. UDP 67 is the DHCP server port.

### Which command tells a Cisco router which DNS server to ask?
- ip domain-name
- ip host
- ip dns server
- [x] ip name-server
> <code>ip name-server</code> sets the server address. <code>ip domain-name</code> sets the default domain, <code>ip host</code> adds one local name, and <code>ip dns server</code> makes the router answer queries itself.

### How does a PC usually learn the address of its DNS server?
- From an ARP reply
- [x] From a DHCP option
- From the switch
- From the root DNS servers
> The DHCP server hands out the DNS server address with the IP address, mask and gateway. It can also be typed in by hand.
