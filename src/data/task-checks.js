// Which of a lab's checks show that each task is done, so a task can tick itself as the network does what it asks.
// For every build lab and capstone, one entry per task, in order:
//   [i, j, ...]  the task is done when those checks pass (a check that needs several tasks sits on the last of them);
//   'run'        a looking task (show, ping, traceroute): done once its step-by-step commands have been run;
//   []           no check fits; the learner ticks it by hand.
// Incidents share four tasks and follow fixed rules in the app (tasks.js). tests/task-checks.cjs keeps this in step
// with the labs: one entry per task, every check used, and 'run' only where the task's commands only look.
const TASK_CHECKS={
'basic-device-setup':[[0],[1],[2],[3],[4],[5],[6],[7],[8],[9]],
'vlans-and-access-ports':[[0,1],[2],[3],'run',[4]],
'802-1q-trunking':[[0],[1],[2],[3],[4]],
'router-on-a-stick':[[0],[1],[2],[3],[4]],
'static-routing':[[0,1],[2],[3],'run',[4,5]],
'single-area-ospf':[[0],[1,3],[2],'run',[4]], // neighbours and learned routes follow from advertising the networks
'spanning-tree-root-bridge-and-edge-ports':['run',[0],[1],[2],[3],[4]],
'etherchannel-with-lacp':[[],[0,1,2],[3],[4]], // a bundle needs both switches
'dhcp-server-and-relay':[[0],[],[1],[2],[3,4],[5]], // "both pools" is checked once, after the second pool
'nat-overload-pat':[[0],[],[1],[2],[3,4],'run'],
'standard-acl':['run',[],[0],[1],[2,3,4],'run'], // the ACL is checked whole, after its second line
'extended-named-acl':[[],[],[],[0],[1],[2,3,4,5]], // the ACL is checked once its entries are in; the entries are proved by the last task
'port-security':[[],[1],[0],[2],[3],[4]],
'ssh-remote-access':['run',[0],[1],[2],[3],[4],[5,6]],
'static-nat-publish-a-server':[[0],[1],[2],'run',[3,4]],
'native-vlan-and-allowed-vlans-on-trunks':['run',[0],[],[1],[2],[3,4]], // "both ends" is checked after the second switch
'switch-management-access':['run',[0],[1],[2,3],[],[4],[5]],
'locking-down-device-access':[[0],[1],[2],[3],[],[4],[5,6],[7]],
'ospf-router-ids-and-passive-interfaces':['run',[],[0],[],[1,2,3],[4,5]], // IDs apply after the restart; passive is checked with G0/1 back on
'per-vlan-root-bridges':['run',[0],[],[1,2],[3],[4]],
'map-an-unknown-network-with-cdp':['run',[0],[1],[2],[3],[4],[5,6]],
'small-office-build':[[0],[1,6],[2],[3],[],[4],[5]],
'floating-static-route':['run',[0],[1],[2],[3,5],[4]],
'how-a-router-chooses-a-route':['run',[0],[1,3],'run',[2]],
'ospf-on-a-shared-segment':['run',[],[0,1],[2],[3],[4]], // the DR and BDR settle once R1 and R2 step aside
'lldp':['run',[0,3],[1],'run',[2],[4]],
'voice-vlan':['run',[0],[1],'run',[2,3],[4]],
'dynamic-nat-with-a-pool':[[2],[0],[],'run',[1,4],[3]], // the rule is checked with overload; all three PCs only get through once the pool is overloaded
'named-acls-and-sequence-numbers':['run',[0],[1],[2],[3,4],'run'],
'ntp-and-syslog':['run',[0],[1],[2],[3,4],[]],
'inter-vlan-routing-on-a-layer-3-switch':['run',[0],[1],[2],[3],[4,5]],
'dhcp-snooping':['run',[0],[1],[2,4],[3,5,6]], // only R1 answers once option 82 is off
'dynamic-arp-inspection':['run',[0],[1],[2,3],[4]], // all three reach the gateway once the printer has its binding
'ipv6-addressing':[[0],[1],[2],'run',[3],[4],[5]],
'ipv6-static-and-default-routes':['run',[0],[1],[2,4],[3],[5]], // PC2's reach includes BR's loopback, added in task 4
'first-hop-redundancy-with-hsrp':['run',[2],[0,1],[3,5],[4],[]], // "R1 takes the role back" holds once preempt is on, and fails while R1 is down: checked with the gateway test
'multi-area-ospf':[[],[1],[3],[0,2,4],[6],[5,7]], // area 0 and area 2 neighbours, and all four routers, once R4 is done
'wiring-a-wireless-lan':[[0],[1],[2],[3],[4],[5,6,7]],
'capstone-branch-office-from-scratch':[[0],[1],[7],[],[],[],[],[2,3,4,5,6]], // leases, browsing, guests and SSH are all proved once the PCs renew in the last task
'capstone-campus-core':[[0],[1],[2],[],[3],[4,5],[],[6,7]], // the VLAN routes need the routed link; the relayed leases need the renew
};
