---
title: Binary and the powers of two
name: How to turn masks into numbers fast
topic: true
ccna: 1.6
mins: 8
---

## Why you need this
<p>Every subnetting question on the exam is a binary question in disguise. You do not need to convert long numbers. You need eight place values and eight mask values in your head, so that a question takes thirty seconds, not three minutes.</p><p>This lesson gives you those two lists and shows how everything else comes from them. The next two lessons use them.</p>

## Eight bits, eight place values
<p>An octet is 8 bits. Each bit has a fixed value. From left to right they are:</p><p><code>128 64 32 16 8 4 2 1</code></p><p>Each value is double the one to its right. To read a binary octet, add the values where the bit is 1. So <code>11000000</code> is 128 + 64 = <b>192</b>, and <code>00001010</code> is 8 + 2 = <b>10</b>.</p><p>To go the other way, subtract from the left. For 172: it holds 128 (44 left), not 64, holds 32 (12 left), not 16, holds 8 (4 left), holds 4 (0 left). That gives <code>10101100</code>.</p>

## The eight mask values
<p>A mask is always a run of 1s followed by 0s. So an octet in a mask can only be one of nine values. Add the place values from the left, one bit at a time:</p><ul><li>1 bit: <b>128</b></li><li>2 bits: <b>192</b></li><li>3 bits: <b>224</b></li><li>4 bits: <b>240</b></li><li>5 bits: <b>248</b></li><li>6 bits: <b>252</b></li><li>7 bits: <b>254</b></li><li>8 bits: <b>255</b></li></ul><p>The ninth value is 0, for no bits. Any other number in a mask, such as 255.255.255.200, is not a valid mask. The exam does offer invalid masks as wrong answers.</p>

## From prefix length to mask
<p>A prefix length is the count of 1 bits. Take off 8 for every full octet of 255, and what is left tells you the last mask value.</p><ol><li><b>/26</b>: three full octets use 24 bits. 2 bits remain. Two bits is 192. Mask: 255.255.255.192.</li><li><b>/20</b>: two full octets use 16 bits. 4 bits remain. Four bits is 240. Mask: 255.255.240.0.</li><li><b>/13</b>: one full octet uses 8 bits. 5 bits remain. Five bits is 248. Mask: 255.248.0.0.</li></ol><p>The octet where the mask is neither 255 nor 0 is the <b>interesting octet</b>. All the subnetting work happens there.</p>

## Powers of two
<p>The other list is the powers of two, because bits double each time:</p><p><code>2 4 8 16 32 64 128 256 512 1024</code></p><p>These are 2 to the power 1 through 10. Use them two ways:</p><ul><li><b>Hosts</b>: with h host bits a subnet has 2^h addresses and 2^h - 2 usable hosts. Five host bits give 32 addresses and 30 hosts.</li><li><b>Subnets</b>: borrowing b bits makes 2^b subnets. Borrowing 3 bits from a /24 makes 8 subnets, each a /27.</li></ul><p>Host bits are 32 minus the prefix length. A /27 has 5 host bits. A /22 has 10 host bits: 1024 addresses, 1022 hosts.</p>

## Block size ties it together
<p>The <b>block size</b> is 256 minus the mask value in the interesting octet. It is the gap between one subnet and the next. It is also the place value of the last network bit, which is why the two lists agree:</p><ul><li>Mask 192: block 64.</li><li>Mask 224: block 32.</li><li>Mask 240: block 16.</li><li>Mask 248: block 8.</li><li>Mask 252: block 4.</li></ul><p>Subnets start at multiples of the block size. With a block of 32 they start at 0, 32, 64, 96, 128, 160, 192 and 224. Write these lists out by hand a few times. Then use the Subnetting drill under Practice until the answers come without thinking.</p>

## @terms
- Bit :: A single binary digit, 0 or 1.
- Octet :: Eight bits; one of the four numbers in an IPv4 address.
- Place value :: The amount a bit adds when it is 1: 128, 64, 32, 16, 8, 4, 2 or 1.
- Interesting octet :: The octet where the mask is neither 255 nor 0; the subnet boundary falls inside it.
- Block size :: 256 minus the mask value in the interesting octet; the gap between subnet numbers.
- Host bits :: The bits to the right of the prefix; 32 minus the prefix length.

## @exam
- 1.6: configure and verify IPv4 addressing and subnetting. There is no calculator, so speed with these two lists matters.
- Know the mask values by heart: 128, 192, 224, 240, 248, 252, 254, 255. Anything else in a mask is invalid.
- Usable hosts are 2^h - 2. Subnets made by borrowing b bits are 2^b.
- /30 gives 2 usable hosts, /29 gives 6, /28 gives 14, /27 gives 30, /26 gives 62, /25 gives 126, /24 gives 254.

## @mistakes
- Forgetting to subtract 2 for hosts. A /28 has 16 addresses but only 14 usable hosts.
- Subtracting 2 from the number of subnets. That is an old rule and is not used on this exam; 3 borrowed bits make 8 usable subnets.
- Counting the prefix bits wrong in the middle octets. For /20, take off 16 first, then deal with the 4 bits that remain.

## @quiz

### What is the subnet mask for a /21 prefix?
- 255.255.240.0
- [x] 255.255.248.0
- 255.255.252.0
- 255.255.255.248
> Two full octets use 16 bits, leaving 5. Five bits is 248, and it lands in the third octet: 255.255.248.0. 255.255.255.248 is /29.

### How many usable host addresses does a /27 have?
- [x] 30
- 32
- 62
- 14
> A /27 has 5 host bits. 2^5 is 32 addresses, minus the network and broadcast addresses leaves 30.

### Which of these is not a valid subnet mask?
- 255.255.254.0
- 255.255.255.252
- 255.224.0.0
- [x] 255.255.255.232
> 232 is 11101000 in binary. The 1s are not one unbroken run, so it cannot be a mask. The mask values are 128, 192, 224, 240, 248, 252, 254 and 255.

### A /24 is split into /28 subnets. How many subnets is that?
- 4
- 8
- [x] 16
- 32
> Going from /24 to /28 borrows 4 bits. 2^4 is 16 subnets, each with 14 usable hosts.

### What is the block size for the mask 255.255.255.224?
- 16
- [x] 32
- 64
- 224
> 256 - 224 = 32. Subnets start at .0, .32, .64 and so on.
