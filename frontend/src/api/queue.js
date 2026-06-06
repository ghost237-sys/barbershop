import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const api = axios.create({ baseURL: BASE })

export const getBarbers = () =>
  api.get('/barbers/').then(r => r.data)

export const checkIn = (payload) =>
  api.post('/checkin/', payload).then(r => r.data)

export const getEntry = (token) =>
  api.get(`/queue/entry/${token}/`).then(r => r.data)

export const getQueue = () =>
  api.get('/queue/').then(r => r.data)

// Add these to the existing queue.js file

export const barberNext   = (barberId) =>
  api.post(`/barber/${barberId}/next/`).then(r => r.data)

export const barberNoShow = (barberId) =>
  api.post(`/barber/${barberId}/noshow/`).then(r => r.data)

export const barberOffDuty = (barberId) =>
  api.post(`/barber/${barberId}/offduty/`).then(r => r.data)

export const barberOnDuty  = (barberId) =>
  api.post(`/barber/${barberId}/onduty/`).then(r => r.data)
