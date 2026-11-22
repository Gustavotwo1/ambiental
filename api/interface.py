import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import requests
import pickle
from datetime import datetime, timezone, timedelta
import sensor_pb2

API_URL = "http://localhost:8000/api/leituras"
FUSO_LOCAL = timezone(timedelta(hours=-3))


def buscar_api(formato):
    try:
        return requests.get(API_URL, params={"formato": formato}, timeout=5)
    except Exception as e:
        messagebox.showerror("Erro de Conexão", f"Verifique se o uvicorn está rodando.\nDetalhe: {e}")
        return None


def testar_formato(formato):
    resp = buscar_api(formato)
    if not resp:
        return
    lbl_info.config(text=f"Status: {resp.status_code} | Content-Type: {resp.headers.get('content-type')} | Tamanho: {len(resp.content)} bytes")
    txt_a.delete("1.0", tk.END)
    if formato == "protobuf":
        lista = sensor_pb2.ListaLeituras()
        lista.ParseFromString(resp.content)
        txt_a.insert(tk.END, f"BINÁRIO ({len(resp.content)} bytes):\n{resp.content}\n\nDECODIFICADO:\n")
        for l in lista.leituras:
            txt_a.insert(tk.END, f"{l.sensor_id} | {l.localizacao} | Temp: {l.temperatura}°{l.unidade_temp} | Hora: {l.timestamp}\n")
    elif formato == "serializacao":
        txt_a.insert(tk.END, f"BINÁRIO ({len(resp.content)} bytes):\n{resp.content}\n\nDESSERIALIZADO:\n{pickle.loads(resp.content)}")
    else:
        txt_a.insert(tk.END, resp.text)


def atualizar_grupo_b():
    resp = buscar_api("protobuf")
    if not resp:
        return
    lista = sensor_pb2.ListaLeituras()
    lista.ParseFromString(resp.content)
    for row in tree.get_children():
        tree.delete(row)
    txt_log.delete("1.0", tk.END)
    temps, umids, criticos = [], [], 0

    for l in lista.leituras:
        dt = datetime.fromisoformat(l.timestamp.replace("Z", "+00:00")).astimezone(FUSO_LOCAL)
        hora = dt.strftime("%d/%m %H:%M")
        alertas = []

        if not l.HasField("temperatura") or l.temperatura <= -100:
            t_str = "INVÁLIDO"
            alertas.append("Erro Temp")
            txt_log.insert(tk.END, f"[ERRO] {l.sensor_id}: temperatura {l.temperatura} descartada.\n")
        else:
            tc = (l.temperatura - 32) * 5 / 9 if l.unidade_temp.upper() == "F" else l.temperatura
            if l.unidade_temp.upper() == "F":
                txt_log.insert(tk.END, f"[UNIDADE] {l.sensor_id}: {l.temperatura}°F -> {tc:.1f}°C\n")
            temps.append(tc)
            t_str = f"{tc:.1f} °C"
            if tc > 35:
                alertas.append("Calor Crítico")

        if not l.HasField("umidade"):
            u_str = "AUSENTE"
            alertas.append("Umidade Ausente")
            txt_log.insert(tk.END, f"[AUSENTE] {l.sensor_id}: sem umidade.\n")
        else:
            umids.append(l.umidade)
            u_str = f"{l.umidade:.1f} %"
            if l.umidade < 25:
                alertas.append("Seca Crítica")

        if alertas:
            criticos += 1
        status = "ALERTA: " + ", ".join(alertas) if alertas else "Normal"
        tree.insert("", tk.END, values=(l.sensor_id, l.localizacao, hora, t_str, u_str, status))

    mt = sum(temps) / len(temps) if temps else 0
    mu = sum(umids) / len(umids) if umids else 0
    lbl_resumo.config(text=f"Média Temp: {mt:.1f} °C   |   Média Umidade: {mu:.1f} %   |   Alertas Críticos: {criticos}")


root = tk.Tk()
root.title("Estudo de Caso 1 - Grupo A & Grupo B")
root.geometry("880x580")

abas = ttk.Notebook(root)
abas.pack(fill="both", expand=True, padx=10, pady=10)
aba1, aba2 = ttk.Frame(abas, padding=10), ttk.Frame(abas, padding=10)
abas.add(aba1, text="1. Formatos API Mock (Grupo A)")
abas.add(aba2, text="2. Painel Padronizado (Grupo B)")

fr_btn = tk.Frame(aba1)
fr_btn.pack(fill="x")
for nome, fmt in [("JSON", "json"), ("XML", "xml"), ("YAML", "yaml"), ("CSV", "csv"), ("Protobuf", "protobuf"), ("Pickle", "serializacao")]:
    ttk.Button(fr_btn, text=nome, command=lambda f=fmt: testar_formato(f)).pack(side="left", expand=True, fill="x", padx=2)

lbl_info = tk.Label(aba1, text="Clique em um formato acima...", font=("Segoe UI", 9, "bold"), fg="#0052cc")
lbl_info.pack(anchor="w", pady=6)
txt_a = scrolledtext.ScrolledText(aba1, font=("Consolas", 10))
txt_a.pack(fill="both", expand=True)

ttk.Button(aba2, text="Carregar e Padronizar Leituras (Grupo B)", command=atualizar_grupo_b).pack(anchor="e", pady=(0, 6))
lbl_resumo = tk.Label(aba2, text="Média Temp: --   |   Média Umidade: --   |   Alertas Críticos: 0", font=("Segoe UI", 11, "bold"))
lbl_resumo.pack(anchor="w", pady=4)

cols = ("id", "local", "hora", "temp", "umid", "status")
tree = ttk.Treeview(aba2, columns=cols, show="headings", height=7)
for c, t in zip(cols, ["Sensor", "Localização", "Hora (UTC-3)", "Temp (°C)", "Umidade", "Diagnóstico"]):
    tree.heading(c, text=t)
    tree.column(c, width=135, anchor="center")
tree.pack(fill="both", expand=True, pady=6)

txt_log = scrolledtext.ScrolledText(aba2, height=6, font=("Consolas", 9))
txt_log.pack(fill="x")

root.mainloop()
