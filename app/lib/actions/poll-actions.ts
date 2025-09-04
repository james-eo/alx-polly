"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// CREATE POLL
export async function createPoll(formData: FormData) {
  const supabase = await createClient();

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  if (!question || options.length < 2) {
    return { error: "Please provide a question and at least two options." };
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: "Failed to retrieve user information." };
  }
  if (!user) {
    return { error: "You must be logged in to create a poll." };
  }

  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question,
      options,
    },
  ]);

  if (error) {
    return { error: "Failed to create poll." };
  }

  revalidatePath("/polls");
  return { error: null };
}

// GET USER POLLS
export async function getUserPolls() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: "Failed to retrieve user polls." };
  return { polls: data ?? [], error: null };
}

// GET POLL BY ID
export async function getPollById(id: string) {
  const supabase = await createClient();

  const { data: poll, error } = await supabase
    .from("polls")
    .select("*, options(*)") // Select poll and its options
    .eq("id", id)
    .single();

  if (error) {
    return { poll: null, error: "Failed to retrieve poll." };
  }
  if (!poll) {
    return { poll: null, error: "Poll not found." };
  }

  // Check authorization
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If poll requires authentication and user is not logged in, deny access
  if (poll.settings?.requireAuthentication && !user) {
    return { poll: null, error: "Authentication required to view this poll." };
  }

  // If the user is not the creator, and the poll is private (requires authentication),
  // then deny access. Public polls (requireAuthentication: false) are viewable by anyone.
  if (
    user &&
    poll.user_id !== user.id &&
    poll.settings?.requireAuthentication
  ) {
    return { poll: null, error: "You are not authorized to view this poll." };
  }

  return { poll: poll, error: null };
}

// SUBMIT VOTE
export async function submitVote(pollId: string, optionIndex: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch poll to check settings
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id, user_id, settings")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { error: "Poll not found or an error occurred." };
  }

  // Check if poll requires authentication
  if (poll.settings?.requireAuthentication && !user) {
    return { error: "You must be logged in to vote on this poll." };
  }

  // Check if multiple votes are allowed
  if (!poll.settings?.allowMultipleVotes && user) {
    const { data: existingVote, error: voteError } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .single();

    if (voteError && voteError.code !== "PGRST116") {
      // PGRST116 means no rows found
      return { error: "Failed to check existing votes." };
    }
    if (existingVote) {
      return { error: "You have already voted on this poll." };
    }
  }

  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user?.id ?? null,
      option_index: optionIndex,
    },
  ]);

  if (error) return { error: "Failed to submit vote." };
  revalidatePath(`/polls/${pollId}`);
  return { error: null };
}

// DELETE POLL
export async function deletePoll(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "You must be logged in to delete a poll." };
  }

  // Fetch the poll to verify ownership
  const { data: poll, error: fetchError } = await supabase
    .from("polls")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchError || !poll) {
    return { error: "Poll not found or an error occurred." };
  }

  if (poll.user_id !== user.id) {
    return { error: "You are not authorized to delete this poll." };
  }

  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) return { error: "Failed to delete poll." };
  revalidatePath("/polls");
  return { error: null };
}

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  if (!question || options.length < 2) {
    return { error: "Please provide a question and at least two options." };
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: "Failed to retrieve user information." };
  }
  if (!user) {
    return { error: "You must be logged in to update a poll." };
  }

  // Only allow updating polls owned by the user
  const { error } = await supabase
    .from("polls")
    .update({ question, options })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Failed to update poll." };
  }

  revalidatePath(`/polls/${pollId}`);
  return { error: null };
}
