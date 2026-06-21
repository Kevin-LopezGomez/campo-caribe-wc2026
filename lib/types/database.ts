export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---- Domain enums (defined first so they can be used in the Database type) ----
export type Round = "R32" | "R16" | "QF" | "SF" | "F";
export type MatchStatus = "scheduled" | "live" | "completed";
export type UserRole = "user" | "admin" | "dev";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          employee_id: string;
          full_name: string;
          role: UserRole;
          is_test: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          employee_id: string;
          full_name: string;
          role?: UserRole;
          is_test?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          full_name?: string;
          role?: UserRole;
          is_test?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      approved_employees: {
        Row: {
          id: string;
          employee_id: string;
          full_name: string;
          access_key: string;
          role: UserRole;
          is_test: boolean;
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
          role?: UserRole;
          is_test?: boolean;
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
          role?: UserRole;
          is_test?: boolean;
          is_registered?: boolean;
          registered_at?: string | null;
          added_at?: string;
          added_by?: string | null;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_leaderboard: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          full_name: string;
          employee_id: string;
          role: UserRole;
          is_test: boolean;
          total_points: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ---- Convenience row types ----
export type Profile          = Database["public"]["Tables"]["profiles"]["Row"];
export type ApprovedEmployee = Database["public"]["Tables"]["approved_employees"]["Row"];
export type Team             = Database["public"]["Tables"]["teams"]["Row"];
export type Match            = Database["public"]["Tables"]["matches"]["Row"];
export type RideOrDiePick    = Database["public"]["Tables"]["ride_or_die_picks"]["Row"];
export type MatchPick        = Database["public"]["Tables"]["match_picks"]["Row"];
export type ScoreEvent       = Database["public"]["Tables"]["score_events"]["Row"];
export type Setting          = Database["public"]["Tables"]["settings"]["Row"];

// ---- Composite/derived types ----
export type LeaderboardEntry = {
  user_id: string;
  full_name: string;
  employee_id: string;
  role: UserRole;
  is_test: boolean;
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
