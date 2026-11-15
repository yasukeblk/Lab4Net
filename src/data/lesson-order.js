// The order lessons are taught in, for each CCNA exam topic (FIXES-PLAN.md phase 7). The Lessons list, Previous and
// Next in the reader, and the lesson web pages all follow it. Every lesson appears exactly once, in the group of its
// first exam objective (tests/lessons-order.cjs checks both). A new lesson must be added here too.
const LESSON_ORDER={
'1':[ // Network fundamentals: the models and the addresses first, then the devices that use them
 'the-osi-and-tcp-ip-models','network-components-and-topologies','cables-interfaces-and-their-faults','tcp-and-udp',
 'binary-and-the-powers-of-two','ipv4-addresses-subnets-and-private-ranges','subnetting-questions-the-exam-asks','vlsm-subnets-of-different-sizes',
 'how-a-switch-forwards-frames','arp-and-the-journey-of-a-packet','basic-device-setup','switch-management-access','vlans-and-access-ports',
 'dhcp-server-and-relay','ipv6-addressing','ipv6-neighbor-discovery','wireless-principles','wiring-a-wireless-lan',
 'virtualization-and-the-cloud','finding-a-fault-step-by-step'],
'2':[ // Network access: trunks, then routing between VLANs, then spanning tree, bundles, discovery, wireless and management
 '802-1q-trunking','native-vlan-and-allowed-vlans-on-trunks','voice-vlan','router-on-a-stick','inter-vlan-routing-on-a-layer-3-switch',
 'spanning-tree-root-bridge-and-edge-ports','per-vlan-root-bridges','protecting-the-spanning-tree','etherchannel-with-lacp',
 'map-an-unknown-network-with-cdp','lldp','wireless-architectures-and-ap-modes','managing-devices-and-aaa'],
'3':[ // IP connectivity: how a router chooses, static routes, then OSPF from one area to several, then redundancy
 'how-a-router-chooses-a-route','static-routing','floating-static-route','ipv6-static-and-default-routes','single-area-ospf',
 'ospf-router-ids-and-passive-interfaces','ospf-on-a-shared-segment','ospf-neighbor-states-and-troubleshooting','multi-area-ospf',
 'first-hop-redundancy-with-hsrp','small-office-build'],
'4':[ // IP services: names, then address translation, then the services that run the network
 'dns-names-to-addresses','nat-overload-pat','static-nat-publish-a-server','dynamic-nat-with-a-pool','ntp-and-syslog',
 'snmp-tftp-and-ftp','ssh-remote-access','quality-of-service'],
'5':[ // Security fundamentals: the ideas, then device access, then ACLs, then switch and wireless protection
 'security-concepts-and-programs','passwords-mfa-and-vpns','locking-down-device-access','standard-acl','extended-named-acl',
 'named-acls-and-sequence-numbers','port-security','dhcp-snooping','dynamic-arp-inspection','securing-and-configuring-a-wlan'],
'6':[ // Automation and programmability
 'automation-and-controller-based-networking','rest-apis-and-json','ansible-and-terraform','ai-and-machine-learning-in-network-operations']
};
