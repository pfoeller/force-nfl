"""Loaded only by the runner's test-child PYTHONPATH, including subprocesses."""
import ipaddress
import socket


def _loopback(host):
    if host == 'localhost':
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def _check(address):
    if isinstance(address, tuple) and not _loopback(address[0]):
        raise RuntimeError(f'External test network/public listener disabled: {address}')


for _name in ('connect', 'connect_ex', 'bind'):
    _original = getattr(socket.socket, _name)

    def _guarded(self, address, *args, _method=_original):
        _check(address)
        return _method(self, address, *args)

    setattr(socket.socket, _name, _guarded)

_original_sendto = socket.socket.sendto


def _sendto(self, *args):
    _check(args[-1])
    return _original_sendto(self, *args)


socket.socket.sendto = _sendto
_original_getaddrinfo = socket.getaddrinfo


def _getaddrinfo(host, *args, **kwargs):
    if host is not None and not _loopback(host):
        raise RuntimeError(f'External test DNS disabled: {host}')
    return _original_getaddrinfo(host, *args, **kwargs)


socket.getaddrinfo = _getaddrinfo
