export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          employee_id: string;
          full_name: string;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          employee_id: string;
          full_name: string;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          full_name?: string;
          is_admin?: boolean;
          created_at?: string;
        };
      };
      approved_employees: {
        Row: {
          id: string;
          employee_id: string;
          full_name: string;
          access_key: string;
          is_admin: boolean;
          is_registered: boolean;
          registered_at: string | null;
          added_at: string;
          added_by: string | null;
        };
        Insert: {
          id?: string;
          employee_id: string;
          full_name: string;
          access_key: string;
          is_admin?: boolean;
          is_registered?: boolean;
          registered_at?: string | null;
          added_at?: string;
          added_by?: string | null;
        };
        Update: {
          id?: string;
          employee_id?: string;
          full_name?: string;
          access_key?: string;
          is_admin?: boolean;
          is_registered?: boolean;
          registered_at?: string | null;
          added_at?: string;
          added_by?: string | null;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          country_code: string;
          flag_emoji: string;
          group_letter: string | null;
          is_top_20: boolean;
          eliminated: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          country_code: string;
          flag_emoji: string;
          group_letter?: string | null;
          is_top_20?: boolean;
          eliminated?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          country_code?: string;
          flag_emoji?: string;
          group_letter?: string | null;
          is_top_20?: boolean;
          eliminated?: boolean;
        };
      };
      matches: {
        Row: {
          id: string;
          round: Round;
          team_home_id: string | null;
          team_away_id: string | null;
          kickoff_time: string;
          status: MatchStatus;
          winner_team_id: string | null;
          home_score: number | null;
          away_score: number | null;
          next_match_id: string | null;
        };
        Insert: {
          id?: string;
          round: Round;
          team_home_id?: string | null;
          team_away_id?: string | null;
          kickoff_time: string;
          status?: MatchStatus;
          winner_team_id?: string | null;
          home_score?: number | null;
          away_score?: number | null;
          next_match_id?: string | null;
        };
        Update: {
          id?: string;
          round?: Round;
          team_home_id?: string | null;
          team_away_id?: string | null;
          kickoff_time?: string;
          status?: MatchStatus;
          winner_team_id?: string | null;
          home_score?: number | null;
          away_score?: number | null;
          next_match_id?: string | null;
        };
      };
      ride_or_die_picks: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          locked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id: string;
          locked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string;
          locked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      match_picks: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          winner_team_id: string;
          predicted_home_score: number | null;
          predicted_away_score: number | null;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          winner_team_id: string;
          predicted_home_score?: number | null;
          predicted_away_score?: number | null;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string;
          winner_team_id?: string;
          predicted_home_score?: number | null;
          predicted_away_score?: number | null;
          submitted_at?: string;
          updated_at?: string;
        };
      };
      score_events: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          reason: string;
          match_id: string | null;
          team_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points: number;
          reason: string;
          match_id?: string | null;
          team_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          points?: number;
          reason?: string;
          match_id?: string | null;
          team_id?: string | null;
          created_at?: string;
        };
      };
      settings: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: {
          key?: string;
          value?: Json;
        };
      };
    };
    Functions: {
      is_admin: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      get_leaderboard: {
        Args: Record<never, never>;
        Returns: LeaderboardEntry[];
      };
    };
  };
}

// ---- Convenience row types ----
export type Profile         = Database["public"]["Tables"]["profiles"]["Row"];
export type ApprovedEmployee = Database["public"]["Tables"]["approved_employees"]["Row"];
export type Team            = Database["public"]["Tables"]["teams"]["Row"];
export type Match           = Database["public"]["Tables"]["matches"]["Row"];
export type RideOrDiePick   = Database["public"]["Tables"]["ride_or_die_picks"]["Row"];
export type MatchPick       = Database["public"]["Tables"]["match_picks"]["Row"];
export type ScoreEvent      = Database["public"]["Tables"]["score_events"]["Row"];
export type Setting         = Database["public"]["Tables"]["settings"]["Row"];

// ---- Domain enums ----
export type Round       = "R32" | "R16" | "QF" | "SF" | "F";
export type MatchStatus = "scheduled" | "live" | "completed";

// ---- Derived/composite types ----
export type LeaderboardEntry = {
  user_id: string;
  full_name: string;
  employee_id: string;
  total_points: number;
};

export type MatchWithTeams = Match & {
  team_home: Team | null;
  team_away: Team | null;
  winner_team: Team | null;
};

export type RideOrDiePickWithTeam = RideOrDiePick & {
  team: Team;
};

export type MatchPickWithMatch = MatchPick & {
  match: Match;
  winner_team: Team;
};
