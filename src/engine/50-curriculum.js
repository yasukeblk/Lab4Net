//CCNA-CURRICULUM-START
// ---------- CCNA objective map and troubleshooting incidents (rebuilt from the chatgpt/improvements branch) ----------
// Objective labels describe what this app practices, not complete exam coverage.
const CCNA_SCOPE={exam:'200-301',version:'1.1',verified:'2026-10-04',source:'https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf',rule:'Graded labs and incidents stay at CCNA 200-301 scope.'};
const CCNA_DOMAINS=[['1','Network fundamentals',20],['2','Network access',20],['3','IP connectivity',25],['4','IP services',10],['5','Security fundamentals',15],['6','Automation and programmability',10]];
const CCNA_OBJECTIVES={
 '1.6':'IPv4 addressing and subnetting','1.10':'Client IP parameters','1.13':'Switching concepts',
 '2.1':'VLANs and inter-VLAN connectivity','2.2':'Trunks and 802.1Q','2.4':'LACP EtherChannel','2.5':'Rapid PVST+ interpretation',
 '3.1':'Routing-table interpretation','3.3':'Static routing','3.4':'Single-area OSPFv2',
 '4.1':'Inside-source NAT','4.3':'DHCP and DNS concepts','4.6':'DHCP client and relay','4.8':'SSH management',
 '5.3':'Local device access control','5.6':'Access control lists','5.7':'Layer 2 security'};
const CCNA_LAB_MAP={
 'Basic device setup':['1.6','5.3'],'VLANs and access ports':['1.13','2.1'],'802.1Q trunking':['2.1','2.2'],
 'Router-on-a-stick':['2.1','2.2'],'Static routing':['3.1','3.3'],'Single-area OSPF':['3.1','3.4'],
 'Spanning tree: root bridge and edge ports':['2.5'],'EtherChannel with LACP':['2.4'],
 'DHCP server and relay':['1.10','4.3','4.6'],'NAT overload (PAT)':['4.1'],
 'Standard ACL':['5.6'],'Extended named ACL':['5.6'],'Port security':['5.7'],
 'SSH remote access':['4.8','5.3'],'Static NAT: publish a server':['4.1']};
LABS.forEach(l=>{l.ccna=CCNA_LAB_MAP[l.title]||[];l.kind='build';});
const INCIDENTS=[
 {title:'Incident 01: one Sales PC is isolated',base:'VLANs and access ports',start:'PC1',
  brief:'PC1 and PC2 should communicate in Sales; Engineering still works. The network is already configured. Find the evidence, repair only the fault, and preserve the intended VLAN separation.',
  symptom:['PC1','192.168.10.12'],fault:{SW1:['enable','configure terminal','interface f0/2','switchport access vlan 20','end']},
  repair:{SW1:['enable','configure terminal','interface f0/2','switchport access vlan 10','end','show vlan brief'],PC1:['ping 192.168.10.12'],PC3:['ping 192.168.20.14']},
  steps:['PC1: ping 192.168.10.12 ; PC3: ping 192.168.20.14','SW1: enable | show vlan brief | show running-config','SW1: configure terminal | interface f0/2 | switchport access vlan 10 | end','PC1: ping 192.168.10.12 ; PC3: ping 192.168.20.14'],
  hints:['Compare the failed Sales pair with the working Engineering pair. IP subnet membership alone does not place a host into a switch VLAN.','On SW1, inspect show vlan brief and show running-config. Find Fa0/2 and compare PC2’s access VLAN with the address plan.','SW1 Fa0/2 is in VLAN 20. Restore access VLAN 10; do not move the Sales hosts into Engineering.'],
  lesson:'A host can have the right IP address and an up link while belonging to the wrong broadcast domain. Check both the host subnet and its switch access VLAN.'},
 {title:'Incident 02: Engineering cannot cross floors',base:'802.1Q trunking',start:'PC2',
  brief:'Sales works across the two switches, but the Engineering PCs cannot reach each other. The interswitch link must carry only VLANs 10 and 20. Keep both VLANs intact and restore the service.',
  symptom:['PC2','192.168.20.14'],fault:{SW2:['enable','configure terminal','interface g0/1','switchport trunk allowed vlan 10','end']},
  repair:{SW2:['enable','configure terminal','interface g0/1','switchport trunk allowed vlan 10,20','end','show interfaces trunk'],PC2:['ping 192.168.20.14'],PC1:['ping 192.168.10.13']},
  steps:['PC2: ping 192.168.20.14 ; PC1: ping 192.168.10.13','SW1: enable | show interfaces trunk ; SW2: enable | show interfaces trunk','SW2: configure terminal | interface g0/1 | switchport trunk allowed vlan 10,20 | end','PC2: ping 192.168.20.14 ; PC1: ping 192.168.10.13'],
  hints:['A link can be up and carry one VLAN while dropping another. Compare the working and failing VLAN IDs.','Inspect show interfaces trunk on both switches. A VLAN must be allowed at both ends, not just one.','SW2 Gi0/1 allows only VLAN 10. Restore the allowed list to 10,20, preserving Sales traffic.'],
  lesson:'A trunk being up is only the first check. Its allowed VLAN set must carry the intended VLAN on both ends.'},
 {title:'Incident 03: the request arrives, the reply disappears',base:'Static routing',start:'PC1',
  brief:'The two LANs should communicate through three routers. A ping request can reach the far LAN, but it never returns. The intended design uses a default route from R3 toward R2. Inspect both directions and restore that design.',
  symptom:['PC1','192.168.3.10'],fault:{R3:['enable','configure terminal','no ip route 0.0.0.0 0.0.0.0 10.0.23.1','end']},
  repair:{R3:['enable','configure terminal','ip route 0.0.0.0 0.0.0.0 10.0.23.1','end','show ip route'],PC1:['ping 192.168.3.10'],PC2:['ping 192.168.1.10']},
  steps:['PC1: ping 192.168.3.10','R1: enable | show ip route ; R2: enable | show ip route ; R3: enable | show ip route','R3: configure terminal | ip route 0.0.0.0 0.0.0.0 10.0.23.1 | end','PC1: ping 192.168.3.10 ; PC2: ping 192.168.1.10'],
  hints:['Read the request and reply paths separately. A delivered request is not proof of bidirectional reachability.','On R3, find a route that covers the original source 192.168.1.10. Use show ip route and check the gateway of last resort.','R3 has no default route. Restore 0.0.0.0/0 via 10.0.23.1, then test from both PCs.'],
  lesson:'Routing decisions happen again on the return journey. Every router in that direction needs a route covering the reply destination.'},
 {title:'Incident 04: one VLAN lost its gateway',base:'Router-on-a-stick',start:'PC2',
  brief:'VLAN 10 can reach its gateway. VLAN 20 cannot, and inter-VLAN pings fail. The physical links are up. Compare switch tagging with the router subinterfaces, then restore the intended design.',
  symptom:['PC2','192.168.20.1'],fault:{R1:['enable','configure terminal','interface g0/0.20','encapsulation dot1q 30','end']},
  repair:{R1:['enable','configure terminal','interface g0/0.20','encapsulation dot1q 20','end','show running-config'],PC2:['ping 192.168.20.1'],PC1:['ping 192.168.20.10']},
  steps:['PC2: ping 192.168.20.1 ; PC1: ping 192.168.10.1','SW1: enable | show interfaces trunk ; R1: enable | show running-config | show ip interface brief','R1: configure terminal | interface g0/0.20 | encapsulation dot1q 20 | end','PC2: ping 192.168.20.1 ; PC1: ping 192.168.20.10'],
  hints:['Subinterface numbers are names; they do not automatically select the 802.1Q VLAN ID.','Compare SW1’s VLAN 20 trunk traffic with R1’s encapsulation statement under Gi0/0.20.','Gi0/0.20 is tagged for VLAN 30. Restore encapsulation dot1q 20 while preserving its existing address.'],
  lesson:'Gi0/0.20 could legally use a different tag, but this design requires VLAN 20. The encapsulation command, not the suffix, selects the actual tag.'},
 {title:'Incident 05: the remote client has no lease',base:'DHCP server and relay',start:'PC3',
  brief:'Local clients have valid DHCP leases, but remote PC3 cannot obtain one. Preserve the working pools and find the fault between the remote client and the DHCP server.',
  symptom:['PC3','192.168.10.1'],fault:{R2:['enable','configure terminal','interface g0/1','ip helper-address 10.0.0.99','end'],PC3:['ipconfig /release']},
  repair:{R2:['enable','configure terminal','interface g0/1','ip helper-address 10.0.0.1','end','show running-config'],PC3:['ipconfig /renew','ipconfig','ping 192.168.10.1']},
  steps:['PC3: ipconfig | ipconfig /renew ; PC1: ipconfig','R1: enable | show running-config | show ip dhcp binding ; R2: enable | show running-config','R2: configure terminal | interface g0/1 | ip helper-address 10.0.0.1 | end','PC3: ipconfig /renew | ipconfig | ping 192.168.10.1'],
  hints:['The server works for local clients. Investigate how a client broadcast reaches the server from the other subnet.','Inspect R2’s client-facing Gi0/1 helper address. Compare it with the DHCP server’s transit address on R1.','The helper points at 10.0.0.99. Change it to 10.0.0.1, then renew PC3’s lease. Repairing the relay alone does not give PC3 an address.'],
  lesson:'The relay belongs on the client-facing interface and points to the reachable DHCP server. After a failed acquisition, renew the client to prove the repair.'},
 {title:'Incident 06: ping works, SSH does not',base:'SSH remote access',start:'PC1',
  brief:'PC1 can ping the router, but SSH is unavailable. Retain local authentication and the existing keys. Restore SSH-only management without opening Telnet.',
  symptom:['PC1','192.168.1.1','tcp',22],fault:{R1:['enable','configure terminal','line vty 0 4','transport input telnet','end']},
  repair:{R1:['enable','configure terminal','line vty 0 4','transport input ssh','end','show ip ssh'],PC1:['ssh -l admin 192.168.1.1','yes','S3cure-Pass','exit','telnet 192.168.1.1']},
  steps:['PC1: ping 192.168.1.1 | ssh -l admin 192.168.1.1','R1: enable | show ip ssh | show running-config','R1: configure terminal | line vty 0 4 | transport input ssh | end','PC1: ssh -l admin 192.168.1.1 | yes | S3cure-Pass | exit | telnet 192.168.1.1'],
  hints:['ICMP reachability and an open SSH service are different requirements. Rebuilding routing is unlikely to fix a refused service.','Inspect the VTY transport setting in show running-config, alongside show ip ssh. Keys and version alone do not permit incoming SSH.','The VTY transport allows Telnet only. Restore transport input ssh; verify SSH succeeds and Telnet is refused.'],
  lesson:'Remote management requires both network reachability and a permitted listening service. Keep the encrypted service enabled and the cleartext alternative closed.'}
];
function incidentCommands(net,commands){
 const saved=TRACE;try{for(const [name,lines] of Object.entries(commands)){const d=net.devs[name],s={mode:d.type==='pc'?'pc':'user'};for(const line of lines){const out=execLine(net,d,s,line);if(out.some(l=>/^% (Invalid|Incomplete|Ambiguous|Unrecognized|Unknown|Password too short)|is not recognized as an internal|^Error: unrecognized/i.test(l)))throw Error('Incident setup rejected '+line);}}}finally{TRACE=saved;}
}
for(const spec of INCIDENTS){const base=LABS.find(l=>l.title===spec.base);LABS.push({
 title:spec.title,kind:'incident',group:'Troubleshooting',baseTitle:base.title,ccna:base.ccna.slice(),brief:spec.brief,pos:base.pos,start:spec.start,addr:base.addr,tasks:[
  'Reproduce the reported failure and compare it with a working service.',
  'Gather evidence from show commands and the address plan before changing configuration.',
  'Restore the intended configuration with the smallest repair; preserve working services.',
  'Retest the reported service and confirm the original requirements still hold.'],
 why:['A controlled test establishes the symptom and separates a general outage from a limited failure.','Evidence narrows the failure domain. Configuration text, interface state and packet paths answer different questions.','Changing unrelated settings can hide the original cause or introduce another fault. Keep the known-good design intact.','A successful repair must restore the service and preserve unrelated requirements, including the return path and security policy.'],
 hints:spec.hints,lesson:spec.lesson,solution:spec.repair,checks:base.checks,
 steps:spec.steps.map(t=>t.split(' ; ').map(g=>{const k=g.indexOf(': ');return {dev:g.slice(0,k),cmds:g.slice(k+2).split(' | ')};})),
 build(){const net=base.build();incidentCommands(net,base.solution);incidentCommands(net,spec.fault);return net;}
});}
//CCNA-CURRICULUM-END
