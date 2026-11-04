import { ReplayWorkspace } from "@/components/kairo/replay-workspace";
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{admin?:string}>}){const {id}=await params;const {admin}=await searchParams;return <ReplayWorkspace id={id} admin={admin==="1"}/>;}

