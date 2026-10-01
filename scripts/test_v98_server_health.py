import importlib.util, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server_v98',root/'force_server.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
assert mod.APP_VERSION=='V98',mod.APP_VERSION
assert mod.SERVER_DIAG_VERSION=='V98-DIAG-1',mod.SERVER_DIAG_VERSION
print('PASS: V98 server identity')
