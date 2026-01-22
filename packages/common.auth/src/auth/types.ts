// Example: Define your signup data type
export type SignupData = {
  email: string;
  password: string;
  // Add your signup fields here
};

// Example: Define your signup response type
export type SignUpResponse = {
  id: number;
  email: string;
  // Add your response fields here
};

export type AuthContextT = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  // Example signup - implement your own mutation
  signup: {
    mutate: (data: SignupData) => Promise<void>;
    mutateAsync: (data: SignupData) => Promise<void>;
  };
};
