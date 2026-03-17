from __future__ import annotations

import base64
import io
import json
import os
import tarfile
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

import httpx


class DockerAPIError(RuntimeError):
    def __init__(self, message: str, *, status_code: int = 0, details: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details


@dataclass(frozen=True)
class DockerTLSConfig:
    verify: bool
    ca_cert: Optional[str] = None
    client_cert: Optional[str] = None
    client_key: Optional[str] = None


def _tls_from_env() -> DockerTLSConfig:
    """
    Supports the standard-ish Docker env vars:
    - DOCKER_TLS_VERIFY=1
    - DOCKER_CERT_PATH=<dir containing ca.pem, cert.pem, key.pem>
    """
    tls_verify = os.getenv("DOCKER_TLS_VERIFY", "").strip() in ("1", "true", "yes")
    cert_path = os.getenv("DOCKER_CERT_PATH", "").strip()
    if not tls_verify:
        return DockerTLSConfig(verify=False)
    ca = os.path.join(cert_path, "ca.pem") if cert_path else None
    cert = os.path.join(cert_path, "cert.pem") if cert_path else None
    key = os.path.join(cert_path, "key.pem") if cert_path else None
    return DockerTLSConfig(verify=True, ca_cert=ca, client_cert=cert, client_key=key)


def _docker_base_url() -> str:
    """
    Remote Docker host base URL.
    Examples:
      - http://docker-host:2375
      - https://docker-host:2376
    """
    raw = (os.getenv("DOCKER_HOST") or "").strip()
    if not raw:
        raise DockerAPIError("DOCKER_HOST is not set (expected http(s)://host:port)", status_code=0)
    # Normalize tcp:// to http:// for Engine API
    if raw.startswith("tcp://"):
        raw = "http://" + raw[len("tcp://") :]
    return raw.rstrip("/")


def make_project_tar(files: Dict[str, str]) -> bytes:
    """
    Create a tar archive suitable for Docker PUT /containers/{id}/archive.
    """
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tf:
        for path, content in files.items():
            data = (content or "").encode("utf-8")
            ti = tarfile.TarInfo(name=path)
            ti.size = len(data)
            tf.addfile(ti, io.BytesIO(data))
    return buf.getvalue()


class RemoteDockerHTTP:
    """
    Minimal Docker Engine API client over HTTP(S), designed for remote hosts.
    Uses httpx and supports TLS via DOCKER_TLS_VERIFY/DOCKER_CERT_PATH.
    """

    def __init__(self):
        self.base_url = _docker_base_url()
        self.tls = _tls_from_env()

        verify: Any = True
        cert: Optional[Tuple[str, str]] = None
        if self.tls.verify:
            verify = self.tls.ca_cert or True
            if self.tls.client_cert and self.tls.client_key:
                cert = (self.tls.client_cert, self.tls.client_key)
        else:
            verify = False

        self._client = httpx.Client(base_url=self.base_url, verify=verify, cert=cert, timeout=60.0)

    def _req(self, method: str, path: str, **kwargs) -> httpx.Response:
        resp = self._client.request(method, path, **kwargs)
        if resp.status_code >= 400:
            detail = None
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text
            raise DockerAPIError(f"Docker API error {resp.status_code} {method} {path}", status_code=resp.status_code, details=detail)
        return resp

    def ping(self) -> bool:
        r = self._req("GET", "/_ping")
        return r.text.strip().lower() == "ok"

    def create_container(self, *, name: Optional[str], config: Dict[str, Any]) -> str:
        params = {}
        if name:
            params["name"] = name
        r = self._req("POST", "/containers/create", params=params, json=config)
        return str(r.json().get("Id"))

    def start_container(self, container_id: str) -> None:
        self._req("POST", f"/containers/{container_id}/start")

    def stop_container(self, container_id: str, *, timeout: int = 10) -> None:
        self._req("POST", f"/containers/{container_id}/stop", params={"t": str(timeout)})

    def remove_container(self, container_id: str, *, force: bool = False) -> None:
        self._req("DELETE", f"/containers/{container_id}", params={"force": "1" if force else "0"})

    def inspect_container(self, container_id: str) -> Dict[str, Any]:
        r = self._req("GET", f"/containers/{container_id}/json")
        return dict(r.json())

    def put_archive(self, *, container_id: str, path: str, tar_bytes: bytes) -> None:
        headers = {"Content-Type": "application/x-tar"}
        self._req("PUT", f"/containers/{container_id}/archive", params={"path": path}, content=tar_bytes, headers=headers)

    def get_archive(self, *, container_id: str, path: str) -> bytes:
        r = self._req("GET", f"/containers/{container_id}/archive", params={"path": path})
        return r.content

    def exec_create(self, *, container_id: str, cmd: list[str], workdir: str = "/workspace") -> str:
        payload = {
            "AttachStdout": True,
            "AttachStderr": True,
            "Tty": False,
            "Cmd": cmd,
            "WorkingDir": workdir,
        }
        r = self._req("POST", f"/containers/{container_id}/exec", json=payload)
        return str(r.json().get("Id"))

    def exec_start(self, *, exec_id: str) -> str:
        payload = {"Detach": False, "Tty": False}
        r = self._req("POST", f"/exec/{exec_id}/start", json=payload)
        return r.text

    def logs(self, *, container_id: str, tail: int = 200) -> str:
        params = {
            "stdout": "1",
            "stderr": "1",
            "timestamps": "0",
            "tail": str(tail),
        }
        r = self._req("GET", f"/containers/{container_id}/logs", params=params)
        return r.text

