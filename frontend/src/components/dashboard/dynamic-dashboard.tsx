"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getDynamicDashboard, type DynamicWidget } from "@/lib/api/dynamic-dashboard";
const routes: Record<string,string> = {leads:"/leads", telecalling:"/leads", admissions:"/admissions", students:"/students", partners:"/partners", hr:"/hr", finance:"/finance", marketing:"/leads", organization:"/organization", administration:"/settings/roles", core:"/settings"};
export function DynamicDashboard() {
  const [widgets,setWidgets] = useState<DynamicWidget[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(() => { let mounted=true; getDynamicDashboard().then(result=>{if(mounted)setWidgets(result.widgets);}).catch(e=>{if(mounted)setError(e instanceof Error?e.message:"Dashboard could not be loaded");}).finally(()=>{if(mounted)setLoading(false);});return ()=>{mounted=false;};},[]);
  if(loading)return <p className="p-8">Loading your dashboard...</p>;
  if(error)return <p role="alert" className="p-8 text-red-700">Dashboard unavailable: {error}</p>;
  return <main className="mx-auto max-w-7xl p-6 space-y-6"><h1 className="text-2xl font-bold">My Dashboard</h1>{widgets.length===0?<p>No dashboard widgets are available for your current permissions. Contact your administrator if you need access.</p>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{widgets.map(w=><Link key={w.key} href={routes[w.module] ?? "/"} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md"><p className="text-sm text-slate-600">{w.title}</p><p className="mt-3 text-3xl font-bold">{w.value.toLocaleString("en-IN")}</p><p className="mt-2 text-xs text-slate-500">Records in your authorized scope</p></Link>)}</div>}</main>;
}
