// Preloaded in test children, including subprocesses via NODE_OPTIONS.
// This is a test boundary, never part of the browser or Worker bundle.
const net = require('node:net');
const tls = require('node:tls');
const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns');
const dgram = require('node:dgram');
const {syncBuiltinESMExports} = require('node:module');

function loopback(host) {
  host = String(host ?? '').replace(/^\[|\]$/g, '');
  return host === 'localhost' || host === '::1' || (net.isIP(host) === 4 && host.startsWith('127.'));
}
function check(host) {
  if (!loopback(host)) throw new Error(`External test network/public listener disabled: ${host}`);
}
function connectionHost(args) {
  const first = args[0];
  if (typeof first === 'object') {
    if (first.path) return null; // local IPC
    return first.hostname || first.host || 'localhost';
  }
  if (typeof first === 'number') return typeof args[1] === 'string' ? args[1] : 'localhost';
  return null; // local IPC path
}
for (const [object, key] of [[net,'connect'],[net,'createConnection'],[net.Socket.prototype,'connect'],[tls,'connect']]) {
  const original = object[key];
  object[key] = function (...args) {
    const host = connectionHost(args);
    if (host != null) check(host);
    return original.apply(this, args);
  };
}
for (const object of [http, https]) for (const key of ['request','get']) {
  const original = object[key];
  object[key] = function (first, ...rest) {
    const host = typeof first === 'string' || first instanceof URL
      ? new URL(first).hostname : first?.hostname || first?.host || 'localhost';
    check(host);
    return original.call(this, first, ...rest);
  };
}
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  const first = args[0];
  if (typeof first === 'number') check(typeof args[1] === 'string' ? args[1] : '0.0.0.0');
  else if (typeof first === 'object' && !first.path) check(first.host || '0.0.0.0');
  return listen.apply(this, args);
};
for (const key of ['lookup','resolve','resolve4','resolve6']) {
  const original = dns[key];
  dns[key] = function (host, ...args) { check(host); return original.call(this, host, ...args); };
  const promised = dns.promises[key];
  if (promised) dns.promises[key] = async function (host, ...args) { check(host); return promised.call(this, host, ...args); };
}
// No suite member needs UDP; deny it rather than allowing unguarded sendto.
dgram.createSocket = () => { throw new Error('UDP test network disabled'); };
const fetch = globalThis.fetch;
if (fetch) globalThis.fetch = async function (input, ...args) {
  check(new URL(typeof input === 'string' || input instanceof URL ? input : input.url).hostname);
  return fetch.call(this, input, ...args);
};
syncBuiltinESMExports();
