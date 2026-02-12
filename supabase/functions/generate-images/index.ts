// Deploy this as a Supabase Edge Function
// Secret required: KIE_API_KEY (set via supabase secrets set KIE_API_KEY=your_key)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTaskRequest {
  model: "nano-banana-pro";
  input: {
    prompt: string;
    image_input?: string[];
    aspect_ratio?: string;
    resolution?: string;
    output_format?: string;
  };
  callBackUrl?: string;
}

interface KieResponse {
  code: number;
  msg: string;
  data: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) {
      throw new Error("KIE_API_KEY secret is not configured");
    }

    const body = await req.json();
    const {
      prompt,
      swatch_base64,
      image_input,
      aspect_ratio = "1:1",
      resolution = "1K",
      output_format = "png",
      pose_index // keep for backwards compatibility if needed in response
    } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare image_input
    // If swatch_base64 is provided and image_input is not, use swatch_base64
    let final_image_input = image_input || [];
    if (swatch_base64 && final_image_input.length === 0) {
      final_image_input = [swatch_base64];
    }

    // 1. Create Generation Task
    const createReq: CreateTaskRequest = {
      model: "nano-banana-pro",
      input: {
        prompt,
        image_input: final_image_input,
        aspect_ratio,
        resolution,
        output_format
      }
    };

    console.log("Creating task with payload:", JSON.stringify(createReq));

    const createRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(createReq),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("KIE API createTask error:", errText);
      throw new Error(`KIE API createTask failed: ${createRes.status}`);
    }

    const createData: KieResponse = await createRes.json();
    if (createData.code !== 200) {
      throw new Error(`KIE API error: ${createData.msg}`);
    }

    const taskId = createData.data.taskId;
    console.log(`Task created successfully. taskId: ${taskId}`);

    // 2. Poll Task Status
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 2s = 60s max polling time

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Polling task status (attempt ${attempts})...`);

      const statusRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
        headers: {
          "Authorization": `Bearer ${KIE_API_KEY}`,
        },
      });

      if (!statusRes.ok) {
        console.error(`Status check failed: ${statusRes.status}`);
        throw new Error(`KIE API recordInfo failed: ${statusRes.status}`);
      }

      const statusData: KieResponse = await statusRes.json();
      if (statusData.code !== 200) {
        throw new Error(`KIE API status error: ${statusData.msg}`);
      }

      const { state, resultJson, failMsg } = statusData.data;

      if (state === "success") {
        console.log("Task succeeded!");
        if (resultJson) {
          const results = JSON.parse(resultJson);
          imageUrl = results.resultUrls?.[0];
        }
        break;
      } else if (state === "fail") {
        console.error("Task failed:", failMsg);
        throw new Error(`KIE task failed: ${failMsg || "Unknown error"}`);
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!imageUrl) {
      throw new Error("Generation timed out or failed to return image URL");
    }

    return new Response(
      JSON.stringify({
        image_url: imageUrl,
        taskId,
        pose_index
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

