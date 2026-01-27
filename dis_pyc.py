import dis
import marshal
import sys

def disassemble_pyc(filepath):
    with open(filepath, 'rb') as f:
        # Skip pyc header (16 bytes for Python 3.12)
        f.seek(16)
        try:
            code_obj = marshal.load(f)
            dis.dis(code_obj)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        disassemble_pyc(sys.argv[1])
    else:
        print("Usage: python dis_pyc.py <path_to_pyc>")
