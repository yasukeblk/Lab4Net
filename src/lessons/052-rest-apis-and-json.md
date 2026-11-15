---
title: REST APIs and JSON
name: How scripts talk to network devices
topic: true
ccna: 6.5, 6.7
mins: 9
---

## What an API is for
<p>The CLI was built for people: it prints text that is easy to read but hard for a program to pick apart. An <b>API</b> (Application Programming Interface) is built for programs. A script sends a structured request and gets back structured data it can use directly. Controllers such as Catalyst Center, and many modern devices, offer APIs for this.</p>

## REST in plain terms
<p><b>REST</b> (Representational State Transfer) is a style of API that uses ordinary <b>HTTP</b>, the same protocol as web pages, normally over HTTPS. Each thing the API manages, such as a device, an interface or a VLAN, is a <b>resource</b> with its own address, its <b>URI</b>, for example <code>https://controller/api/v1/devices</code>.</p><p>REST APIs are <b>stateless</b>: the server keeps no memory of earlier requests, so every request must carry everything needed, including proof of who is asking. They follow a client-server model, and responses can be marked as cacheable.</p>

## CRUD and the HTTP verbs
<p>Almost everything a program does with data is one of four actions, called <b>CRUD</b>. REST maps each one to an HTTP verb (also called a method):</p><ul><li><b>Create</b>: <code>POST</code> adds a new resource.</li><li><b>Read</b>: <code>GET</code> retrieves a resource without changing it.</li><li><b>Update</b>: <code>PUT</code> replaces a resource completely. <code>PATCH</code> changes only the fields sent.</li><li><b>Delete</b>: <code>DELETE</code> removes a resource.</li></ul><p>The server answers with a <b>status code</b>. 2xx means success: 200 OK, 201 Created, 204 No Content. 4xx means the client made a mistake: 400 Bad Request, 401 Unauthorized (not authenticated), 403 Forbidden (authenticated but not allowed), 404 Not Found. 5xx means the server failed, such as 500 Internal Server Error.</p>

## Authentication
<p>Because REST is stateless, each request proves who sent it, usually in an HTTP <b>header</b>.</p><ul><li><b>Basic authentication</b>: the username and password are joined and Base64-encoded into the Authorization header. Base64 is encoding, not encryption, so this is only safe over HTTPS.</li><li><b>API key</b>: a long secret value issued to a user or application and sent with each request.</li><li><b>Token</b>: the client logs in once and receives a token, often valid for a limited time, then sends that token with later requests. Bearer tokens and OAuth work this way. Catalyst Center hands out a token that is then sent in a header on each call.</li></ul>

## Data encoding
<p>The data in a request or response must be in a format both sides understand. The common ones are <b>JSON</b>, <b>XML</b> and <b>YAML</b>. The <code>Content-Type</code> header says which format the body is in, and the <code>Accept</code> header says which format the client wants back, for example <code>application/json</code>.</p><p>Putting it together, one request has four parts: the <b>verb</b>, the <b>URI</b> of the resource, the <b>headers</b> (authentication and formats), and for POST, PUT and PATCH a <b>body</b> holding the data. A script that wants the device list sends a GET to the devices URI with its token in a header. The controller replies with a status code of 200 and a JSON body listing each device, which the script can loop through without parsing any CLI text.</p>

## Reading JSON
<p><b>JSON</b> (JavaScript Object Notation) is plain text built from a few pieces:</p><ul><li>An <b>object</b> is wrapped in curly braces <code>{ }</code> and holds <b>key-value pairs</b>, separated by commas. Each key is a string in double quotes, followed by a colon and the value.</li><li>An <b>array</b> is an ordered list in square brackets <code>[ ]</code>, separated by commas.</li><li>A <b>value</b> can be a string in double quotes, a number, <code>true</code> or <code>false</code>, <code>null</code>, an object or an array.</li></ul><p>For example: <code>{"hostname": "R1", "interfaces": [{"name": "G0/0", "enabled": true}]}</code>. That is one object with two keys. The value of interfaces is an array holding one object. Spaces and line breaks between items do not matter. Single quotes, comments and a comma after the last item are not allowed.</p>

## @terms
- API :: A defined way for one program to request data or actions from another.
- REST :: An API style that uses HTTP verbs on resources identified by URIs, and keeps no session state.
- CRUD :: Create, Read, Update, Delete: the four basic actions on data.
- URI :: The address of a resource in a REST API.
- Status code :: A three-digit number in the HTTP response showing success or the kind of failure.
- Token authentication :: Logging in once to receive a token, then sending it with each request.
- JSON object :: A set of key-value pairs inside curly braces.
- JSON array :: An ordered list of values inside square brackets.

## @exam
- 6.5: describe characteristics of REST-based APIs (authentication types, CRUD, HTTP verbs, and data encoding). 6.7: recognize components of JSON-encoded data.
- CRUD to HTTP: Create = POST, Read = GET, Update = PUT or PATCH, Delete = DELETE.
- REST is stateless and client-server. Requests carry their own authentication.
- JSON keys are double-quoted strings. Objects use { }, arrays use [ ], booleans are true and false in lower case.
- Know the status code families: 2xx success, 4xx client error, 5xx server error.

## @mistakes
- Thinking Basic authentication encrypts the password: Base64 is reversible by anyone, so it needs HTTPS.
- Using POST to read data: a read is a GET, and the exam maps verbs to CRUD exactly.
- Counting a whole JSON document as one key-value pair: count the keys inside each object, and remember nested objects have their own.
- Writing JSON with single quotes or a trailing comma: the parser rejects it, and the API returns 400 Bad Request.

## @quiz

### Which HTTP verb creates a new resource in a REST API?
- GET
- PUT
- [x] POST
- DELETE
> POST is Create. PUT updates (replaces) an existing resource, and GET only reads.

### A request is rejected with 401. What does that mean?
- [x] The request was not authenticated
- The resource does not exist
- The server crashed
- The request succeeded with no content
> 401 Unauthorized means the server does not know who you are, for example a missing or expired token. 404 is not found, 5xx is a server failure and 204 is success with no body.

### In <code>{"vlans": [10, 20, 30], "site": "HQ"}</code>, what is the value of vlans?
- An object
- A string
- A key-value pair
- [x] An array
> Square brackets mark an array, here a list of three numbers. The whole thing in curly braces is the object, holding two key-value pairs.

### Why must each REST request carry its own authentication?
- Because JSON cannot hold a password
- [x] Because REST is stateless, so the server keeps no session between requests
- Because HTTPS removes the headers
- Because only GET requests are authenticated
> A stateless server does not remember earlier requests, so every request must prove who sent it, usually with a token or key in a header.

### Which of these is valid JSON?
- [x] {"enabled": true}
- {'enabled': true}
- {"enabled": True,}
- {enabled = true}
> JSON needs double-quoted keys, a colon, and lower-case true. Single quotes, a capital True, a trailing comma and an equals sign are all invalid.
