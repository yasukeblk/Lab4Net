---
title: Wireless principles
name: How Wi-Fi carries data over radio
topic: true
ccna: 1.11
mins: 9
---

## The problem: a shared, invisible medium
<p>A switch port gives each device its own cable. Wi-Fi gives everyone the same air. Every device in range hears every transmission on its channel, so only one can talk at a time, and anyone nearby can listen in.</p><p>That shapes everything about wireless. Devices must take turns, nearby networks must stay off each other's frequencies, and traffic must be encrypted because it cannot be kept off a stranger's laptop. Wi-Fi is defined by the IEEE <b>802.11</b> family of standards.</p>

## Radio frequency basics
<p>Wi-Fi sends data as <b>radio frequency (RF)</b> waves. The <b>frequency</b> is how many times the wave cycles each second, measured in hertz. Wi-Fi uses three bands: <b>2.4 GHz</b>, <b>5 GHz</b> and, since Wi-Fi 6E, <b>6 GHz</b>.</p><p>Higher frequencies carry more data but travel less far and pass through walls less well. 2.4 GHz reaches further but is crowded: microwave ovens, Bluetooth and the neighbours all use it.</p><p>Signals change as they travel. Walls and water (including people) <b>absorb</b> them. Metal and glass <b>reflect</b> them. They <b>refract</b> (bend) through materials of different density, <b>scatter</b> off rough surfaces and <b>diffract</b> around corners. Signal strength is measured in dBm; -30 dBm is very strong and -90 dBm is barely usable.</p>

## Channels and why 1, 6 and 11
<p>Each band is cut into <b>channels</b>. In 2.4 GHz the channel centres are only 5 MHz apart, but each transmission is about 20 to 22 MHz wide, so neighbouring channels overlap. Only <b>1, 6 and 11</b> do not overlap each other (the plan used in North America).</p><p>Two kinds of interference matter:</p><ul><li><b>Co-channel interference</b>: two nearby APs on the same channel must share airtime, so both slow down.</li><li><b>Adjacent-channel interference</b>: APs on overlapping channels (say 1 and 3) corrupt each other's signals. This is worse.</li></ul><p>So neighbouring APs in 2.4 GHz are set to 1, 6 and 11 in a repeating pattern. The 5 GHz band has many more nonoverlapping 20 MHz channels, which is one reason it is preferred where clients support it.</p>

## Taking turns: CSMA/CA
<p>A radio cannot hear a collision while it is transmitting, so Wi-Fi is <b>half duplex</b> and uses <b>CSMA/CA</b> (carrier sense multiple access with collision avoidance). A device listens first, and if the channel is busy it waits a random time before trying again. Every unicast frame must be acknowledged; no acknowledgement means the frame is sent again.</p><p>Two clients at opposite ends of a cell may both hear the AP but not each other, so both think the channel is free and talk at once. This is the <b>hidden node</b> problem. An optional exchange of <b>RTS</b> (request to send) and <b>CTS</b> (clear to send) frames lets the AP reserve the channel for one of them. All this waiting is why a busy Wi-Fi network delivers far less than its headline data rate.</p>

## SSIDs, BSSs and ESSs
<p>The <b>SSID</b> (service set identifier) is the network name users see, such as <i>Office</i>. An AP announces it in <b>beacon</b> frames, several times a second by default.</p><ol><li><b>BSS</b> (basic service set): one AP and its clients. It is identified by the <b>BSSID</b>, the MAC address of the AP's radio. The area it covers is the basic service area, or cell.</li><li><b>ESS</b> (extended service set): several APs sharing the same SSID, joined by a wired network. A client can <b>roam</b> from one AP to the next without changing networks. Cells should overlap by roughly 10 to 15 percent so roaming does not drop.</li><li><b>IBSS</b> (independent BSS, or ad hoc): devices talking directly with no AP.</li></ol><p>The wired network behind the APs is called the <b>distribution system</b>. Each SSID is usually mapped to its own VLAN.</p>

## Encryption, briefly
<p>Because anyone can capture the frames, wireless traffic must be encrypted. <b>WEP</b> was the first attempt and is broken. <b>WPA</b>, <b>WPA2</b> and <b>WPA3</b> replaced it; WPA2 with AES is the common baseline and WPA3 is the current standard. The lesson on securing a WLAN covers how they differ.</p>

## @terms
- SSID :: The network name an AP advertises in its beacons.
- BSSID :: The MAC address of an AP radio; it identifies one BSS.
- BSS :: One AP and the clients associated with it.
- ESS :: Several APs with the same SSID, linked by a wired network, so clients can roam.
- IBSS (ad hoc) :: Wireless devices talking directly to each other with no AP.
- Nonoverlapping channels :: Channels far enough apart not to interfere. In 2.4 GHz: 1, 6 and 11.
- Co-channel interference :: Nearby radios on the same channel having to share airtime.
- CSMA/CA :: Listen before transmitting, wait a random time if busy, and require an acknowledgement for each frame.
- Beacon :: A frame an AP broadcasts regularly to announce its SSID and capabilities.

## @exam
- 1.11: describe wireless principles: nonoverlapping Wi-Fi channels, SSID, RF, encryption.
- 2.4 GHz nonoverlapping channels are 1, 6 and 11. 5 GHz has many more nonoverlapping channels.
- Higher frequency: more bandwidth, shorter range, poorer wall penetration.
- Wi-Fi is half duplex and uses CSMA/CA; wired Ethernet with collisions used CSMA/CD.
- Know BSS, BSSID, ESS and IBSS, and that the BSSID is the AP radio's MAC address.
- Standards: 802.11b/g/n use 2.4 GHz, 802.11a/ac use 5 GHz, 802.11n uses both, 802.11ax (Wi-Fi 6) uses 2.4 and 5 GHz and Wi-Fi 6E adds 6 GHz.

## @mistakes
- Putting neighbouring 2.4 GHz APs on channels such as 1, 3 and 5: they overlap and corrupt each other, so throughput collapses even with a strong signal.
- Turning AP power up to "fix" coverage: cells overlap too much, co-channel interference rises and clients cling to a distant AP.
- Thinking hiding the SSID is security: it still appears in client probes and other frames, so it only hides the network from casual users.
- Confusing SSID with BSSID: one SSID can have many BSSIDs, one per AP radio.

## @quiz

### Three APs cover neighbouring areas in the 2.4 GHz band. Which channel plan avoids overlap?
- 1, 4 and 8
- [x] 1, 6 and 11
- 1, 2 and 3
- 6, 6 and 6
> Only 1, 6 and 11 are far enough apart not to overlap in 2.4 GHz. All on 6 avoids adjacent-channel interference but makes all three share airtime (co-channel interference).

### What identifies a single BSS?
- The SSID
- The VLAN ID
- [x] The BSSID, the MAC address of the AP radio
- The channel number
> Many APs can advertise the same SSID in an ESS, so the SSID does not pick out one BSS. The BSSID, the radio's MAC address, does.

### Why does Wi-Fi use CSMA/CA rather than CSMA/CD?
- [x] A radio cannot detect a collision while it is transmitting
- Wi-Fi is full duplex
- Wi-Fi has no MAC addresses
- Collisions cannot happen on radio
> Collisions do happen on radio, but a transmitting radio cannot hear them. So Wi-Fi avoids them by waiting a random time, and uses acknowledgements to discover lost frames.

### Compared with 2.4 GHz, what is true of 5 GHz?
- Longer range and fewer channels
- Shorter range and fewer channels
- Longer range and more channels
- [x] Shorter range and more nonoverlapping channels
> Higher frequency signals fade sooner and pass through walls less well, but the 5 GHz band offers many more nonoverlapping channels.

### A user walks between two APs with the same SSID and stays connected. What is this set of APs called?
- An IBSS
- A BSS
- [x] An ESS
- A BSSID
> Several APs sharing an SSID over a common wired network form an extended service set, which is what makes roaming possible.
