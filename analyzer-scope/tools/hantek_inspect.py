"""Lista las DLL de Hantek instaladas (arquitectura y funciones exportadas).
Uso en Windows 11:  python hantek_inspect.py
Opcional:           python hantek_inspect.py "C:\\ruta\\a\\Hantek"
Genera hantek_dll_report.txt junto al script. Solo usa la biblioteca estándar.
"""
import os, struct, sys

def rva2off(secs, rva):
    for _, vs, va, rs, raw in secs:
        if va <= rva < va + max(vs, rs):
            return rva - va + raw
    return None

def cstr(d, off):
    return d[off:d.index(b"\0", off)].decode("latin1")

def inspect(path):
    d = open(path, "rb").read()
    pe = struct.unpack_from("<I", d, 0x3C)[0]
    if d[pe:pe + 4] != b"PE\0\0":
        return None, []
    machine, nsec, _, _, _, osz, _ = struct.unpack_from("<HHIIIHH", d, pe + 4)
    opt = pe + 24
    magic = struct.unpack_from("<H", d, opt)[0]
    dd = opt + (96 if magic == 0x10B else 112)
    exp_rva, exp_size = struct.unpack_from("<II", d, dd)
    arch = {0x14C: "32 bits (x86)", 0x8664: "64 bits (x64)"}.get(machine, hex(machine))
    secs = [struct.unpack_from("<8sIIII", d, opt + osz + 40 * i) for i in range(nsec)]
    if not exp_rva:
        return arch, []
    eo = rva2off(secs, exp_rva)
    (_, _, _, _, _, base, nfun, nnam, a_f, a_n, a_o) = struct.unpack_from("<IIHHIIIIIII", d, eo)
    names = []
    for i in range(nnam):
        nr = struct.unpack_from("<I", d, rva2off(secs, a_n) + 4 * i)[0]
        names.append(cstr(d, rva2off(secs, nr)))
    return arch, names

def candidates(extra):
    roots = [extra] if extra else []
    for env in ("ProgramFiles(x86)", "ProgramFiles", "ProgramW6432"):
        p = os.environ.get(env)
        if p:
            roots.append(p)
    seen = set()
    for r in roots:
        if not r or not os.path.isdir(r):
            continue
        for dp, dn, fn in os.walk(r):
            if extra and os.path.abspath(r) == os.path.abspath(extra):
                pass
            elif "hantek" not in dp.lower():
                continue
            for f in fn:
                if f.lower().endswith((".dll", ".exe", ".ocx")) and "hantek" in dp.lower() or \
                   (extra and f.lower().endswith(".dll")):
                    p = os.path.join(dp, f)
                    if p not in seen:
                        seen.add(p)
                        yield p

if __name__ == "__main__":
    extra = sys.argv[1] if len(sys.argv) > 1 else None
    out = []
    for p in candidates(extra):
        try:
            arch, names = inspect(p)
        except Exception as e:
            out.append(f"{p}\n  error: {e}\n")
            continue
        if arch is None:
            continue
        out.append(f"{p}  [{arch}, {os.path.getsize(p)} bytes]")
        out.extend("    " + n for n in names)
        out.append("")
    rep = "\n".join(out) or "No se encontró nada. Pasa la carpeta de instalación como argumento."
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hantek_dll_report.txt")
    open(path, "w", encoding="utf-8").write(rep)
    print(rep[:3000])
    print("\nInforme guardado en:", path)
