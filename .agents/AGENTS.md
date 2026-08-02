# AntStudio Workspace Agent Rules

## ⚠️ CRITICAL: Directory Junction / Circular Loop Warning
The workspace contains a directory junction `ams` (`d:\Workspace\Gits\CamHub\ams\AntStudio\ams`) which points back to the parent directory `ams`. 
This creates an infinite directory loop:
`AntStudio/ -> ams/ -> AntStudio/ -> ams/ -> AntStudio/ ...`

Any recursive directory traversal command or script that does not detect symlinks/junctions will get stuck in an infinite recursion, causing the IDE and tools to hang.

## 🛠️ Command Execution Rules

1. **NEVER run recursive file search commands** in the shell.
   - Do **NOT** use: `Get-ChildItem -Recurse`, `find .`, `grep -r`, or similar command-line tools in PowerShell/Cmd.
   - Instead, use the built-in `grep_search` tool which automatically respects `.gitignore` and ignores circular links.

2. **Junction Detection in Custom Scripts**:
   - If you write or execute custom scripts (Python, Node.js, Shell) that scan or traverse the workspace, you **MUST** explicitly exclude `ams`, `backup`, and `node_modules` folders.
   - You **MUST** resolve paths to detect circular links.
     - **Python**: Use `pathlib.Path.resolve()` and keep a set of visited resolved paths, or check `Path.is_symlink()`.
     - **Node.js**: Use `fs.realpathSync()` to check for already-visited resolved paths.
