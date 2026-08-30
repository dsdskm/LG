import API_BASE from './index'

export async function getRaatHealth() {
  const res = await fetch(`${API_BASE}/api/raat/health`)
  return res.json()
}

export async function getBatteryStatus() {
  const res = await fetch(`${API_BASE}/api/raat/battery`)
  return res.json()
}

export async function getTurtlePose() {
  const res = await fetch(`${API_BASE}/api/raat/pose`)
  return res.json()
}

export async function getRos2Status() {
  const res = await fetch(`${API_BASE}/api/raat/ros2/status`)
  return res.json()
}

export async function getDiagnostics() {
  const res = await fetch(`${API_BASE}/api/raat/diagnostics`)
  return res.json()
}

export async function getTurtleMotion() {
  const res = await fetch(`${API_BASE}/api/raat/turtle/motion`)
  return res.json()
}

export async function setTurtleMotion(enabled) {
  const res = await fetch(`${API_BASE}/api/raat/turtle/motion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ enabled })
  })
  return res.json()
}
