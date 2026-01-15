import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ outputId: string }> | { outputId: string } }
) {
  try {
    const { outputId } = await (typeof params === "object" && "then" in params ? params : Promise.resolve(params))
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch output to get storage_key and verify ownership
    const { data: output, error: outputError } = await supabase
      .from("generated_outputs")
      .select("storage_key, project_id, user_id")
      .eq("id", outputId)
      .eq("user_id", user.id)
      .single()

    if (outputError || !output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 })
    }

    // Delete from storage if storage_key exists
    if (output.storage_key) {
      const { error: storageError } = await supabase.storage
        .from("app-covers")
        .remove([output.storage_key])

      if (storageError) {
        console.error("Storage deletion error:", storageError)
        // Continue with DB deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("generated_outputs")
      .delete()
      .eq("id", outputId)
      .eq("user_id", user.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete output error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete output" },
      { status: 500 }
    )
  }
}
