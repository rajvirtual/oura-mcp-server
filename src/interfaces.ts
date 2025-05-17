// Common response wrapper
export interface OuraApiResponse<T> {
    data: T[];
    next_token?: string;
  }
  
  // Daily Activity
  export interface DailyActivity {
    id: string;
    class_5_min?: string;
    score: number;
    active_calories: number;
    average_met_minutes?: number;
    contributors?: {
      meet_daily_targets?: number;
      move_every_hour?: number;
      recovery_time?: number;
      stay_active?: number;
      training_frequency?: number;
      training_volume?: number;
    };
    equivalent_walking_distance: number;
    high_activity_met_minutes?: number;
    high_activity_time: number;
    inactivity_alerts?: number;
    low_activity_met_minutes?: number;
    low_activity_time: number;
    medium_activity_met_minutes?: number;
    medium_activity_time: number;
    met?: {
      interval: number;
      items: number[];
      timestamp: string;
    };
    meters_to_target: number;
    non_wear_time: number;
    resting_time?: number;
    sedentary_met_minutes?: number;
    sedentary_time?: number;
    steps: number;
    target_calories: number;
    target_meters?: number;
    total_calories: number;
    day: string;
    timestamp?: string;
  }
  
  // Daily Readiness
  export interface DailyReadiness {
    id: string;
    contributors?: {
      activity_balance?: number;
      body_temperature?: number;
      hrv_balance?: number;
      previous_day_activity?: number;
      previous_night?: number;
      recovery_index?: number;
      resting_heart_rate?: number;
      sleep_balance?: number;
    };
    day: string;
    score: number;
    temperature_deviation: number;
    temperature_trend_deviation: number;
    timestamp?: string;
  }
  
  // Daily Sleep
  export interface DailySleep {
    id: string;
    contributors?: {
      deep_sleep?: number;
      efficiency?: number;
      latency?: number;
      rem_sleep?: number;
      restfulness?: number;
      timing?: number;
      total_sleep?: number;
    };
    day: string;
    score: number;
    timestamp?: string;
  }
  
  // Daily Stress
  export interface DailyStress {
    id: string;
    day: string;
    stress_high: number;
    recovery_high: number;
    day_summary: string;
  }
  
  // Sleep Session
  export interface SleepSession {
    id: string;
    average_breath?: number;
    average_heart_rate?: number;
    average_hrv?: number;
    awake_time?: number;
    bedtime_end: string;
    bedtime_start: string;
    day: string;
    deep_sleep_duration: number;
    efficiency: number;
    heart_rate?: {
      interval: number;
      items: number[];
      timestamp: string;
    };
    hrv?: {
      interval: number;
      items: number[];
      timestamp: string;
    };
    latency: number;
    light_sleep_duration: number;
    low_battery_alert?: boolean;
    lowest_heart_rate?: number;
    movement_30_sec?: string;
    period?: number;
    readiness?: {
      contributors: {
        activity_balance: number;
        body_temperature: number;
        hrv_balance: number;
        previous_day_activity: number;
        previous_night: number;
        recovery_index: number;
        resting_heart_rate: number;
        sleep_balance: number;
      };
      score: number;
      temperature_deviation: number;
      temperature_trend_deviation: number;
    };
    readiness_score_delta?: number;
    rem_sleep_duration: number;
    restless_periods?: number;
    sleep_phase_5_min?: string;
    sleep_score_delta?: number;
    sleep_algorithm_version?: string;
    time_in_bed: number;
    total_sleep_duration: number;
    type?: string;
  }
  
  // Heart Rate
  export interface HeartRate {
    bpm: number;
    source: string;
    timestamp: string;
  }
  
  
  export interface EnhancedTag {
    id: string;
    tag_type_code: string;
    start_time: string;
    end_time: string;
    start_day: string;
    end_day: string;
    comment: string;
    custom_name: string;
  }

  export interface TagApiResponse extends OuraApiResponse<EnhancedTag> {
  tagMetadata?: {
    standardTags: number;
    customTags: number;
    note: string;
  };
}