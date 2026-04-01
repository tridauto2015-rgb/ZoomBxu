"use client"

import { useAdmin } from "@/contexts/admin-context"
import { AdminLogin } from "@/components/admin-login"
import { AdminDashboard } from "@/components/admin-dashboard"

export default function AdminPage() {
  const { isAdmin } = useAdmin()

  if (!isAdmin) {
    return <AdminLogin />
  }

  return <AdminDashboard />
}
