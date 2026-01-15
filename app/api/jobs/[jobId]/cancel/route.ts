import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Only allow canceling queued or running jobs
    if (job.status !== "queued" && job.status !== "running") {
      return NextResponse.json(
        { error: `Cannot cancel job with status: ${job.status}` },
        { status: 400 }
      )
    }

    // Update job to cancelled
    const { error: updateError } = await supabase
      .from("generation_jobs")
      .update({
        status: "cancelled",
        finished_at: new Date().toISOString(),
        error_message: "Cancelled by user",
      })
      .eq("id", jobId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true, message: "Generation cancelled" })
  } catch (error: any) {
    console.error("Cancel error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to cancel generation" },
      { status: 500 }
    )
  }
}
