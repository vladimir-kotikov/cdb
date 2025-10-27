# cdb - Code DeBugger

This is the extension to launch debug sessions in VSCode directly from terminal.

## Rationale

There's some demand for an option to launch debug sessions in VSCode from terminal
rather than setting up specific debug configurations even for simple, one-off
debugging tasks.

This extension provides own shell command - 'cdb' - that aims to substitute the
missing but so much desired '--debug' option for the 'code' command.

## Usage

After installing the extension, there's a new command available in command
palette - "CDB: Install shell command" which does exactly that. The 'cdb' is
installed into '/usr/local/bin' directory - the same directory where 'code'
command is installed.

After installing you can start debugging by running `cdb <debug target> <arguments>`,
e.g. `cdb python -m my_module arg1 arg2` or `cdb node myscript.js`. A few examples:

- `cdb /my/python/distro/python -m foo.bar --baz` - starts debugging of a python module
- `cdb python some/script.py --arg` - starts debugging of a python script/file
- `cdb some/script.py` - same as above but shorter

More details on supported arguments and options can be found running `cdb` without arguments.
