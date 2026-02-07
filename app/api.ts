import { router } from "expo-router";
import { storage } from "./storage";

export const BASE_URL = "https://donoxonsi.uz";

export const ENDPOINTS = {
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  profile: "/api/profile",
  tasks: "/api/tasks",
  myTasks: "/api/my-tasks",
  meets: "/api/meets",
  meetWorkers: "/api/meet-workers",
};

interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string | null;
  errors: Record<string, string[]> | null;
  status: number;
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = await storage.getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return {
        success: true,
        data: null,
        message: null,
        errors: null,
        status: 204,
      };
    }

    const data = await response.json();

    if (response.status === 401) {
      await storage.clear();
      router.replace("/login");
      return {
        success: false,
        data: null,
        message: data.message || "Sessiya tugagan. Qayta kiring.",
        errors: null,
        status: 401,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        data: null,
        message: data.message || "Xatolik yuz berdi",
        errors: data.errors || null,
        status: response.status,
      };
    }

    return {
      success: true,
      data: data.data ?? data,
      message: data.message || null,
      errors: null,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      message: "Serverga ulanib bo'lmadi. Internet aloqasini tekshiring.",
      errors: null,
      status: 0,
    };
  }
}

export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>) => {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams(params).toString();
      url = `${endpoint}?${query}`;
    }
    return request<T>(url, { method: "GET" });
  },

  post: <T = any>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: <T = any>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch: <T = any>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T = any>(endpoint: string) => {
    return request<T>(endpoint, { method: "DELETE" });
  },

  upload: async <T = any>(endpoint: string, formData: FormData) => {
    const token = await storage.getToken();

    const headers: HeadersInit = { Accept: "application/json" };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json();

      if (response.status === 401) {
        await storage.clear();
        router.replace("/login");
        return {
          success: false,
          data: null,
          message: "Sessiya tugagan. Qayta kiring.",
          errors: null,
          status: 401,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          data: null,
          message: data.message || "Yuklashda xatolik",
          errors: data.errors || null,
          status: response.status,
        };
      }

      return {
        success: true,
        data: data.data ?? data,
        message: data.message || null,
        errors: null,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: "Serverga ulanib bo'lmadi",
        errors: null,
        status: 0,
      };
    }
  },
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post(ENDPOINTS.login, { email, password }),

  logout: () => api.post(ENDPOINTS.logout),

  profile: () => api.get(ENDPOINTS.profile),
};

export const tasksApi = {
  getAll: (params?: { status?: string; page?: number }) =>
    api.get(ENDPOINTS.tasks, params),

  getById: (id: number) => api.get(`${ENDPOINTS.tasks}/${id}`),

  uploadFiles: (
    taskId: number,
    files: { uri: string; name: string; type?: string }[],
    description?: string,
    location?: { latitude: number; longitude: number },
  ) => {
    const formData = new FormData();

    if (description) {
      formData.append("description", description);
    }

    if (location) {
      formData.append("latitude", location.latitude.toString());
      formData.append("longitude", location.longitude.toString());
    }

    files.forEach((file, i) => {
      formData.append(`files[${i}]`, {
        uri: file.uri,
        name: file.name,
        type: file.type || "application/octet-stream",
      } as any);
    });

    return api.upload(`${ENDPOINTS.tasks}/${taskId}`, formData);
  },
};

export const meetsApi = {
  getAll: (params?: { status?: string }) => api.get(ENDPOINTS.meets, params),

  getById: (id: number) => api.get(`${ENDPOINTS.meets}/${id}`),

  respond: (meetId: number, status: "accepted" | "rejected") =>
    api.post(`${ENDPOINTS.meetWorkers}/${meetId}/respond`, { status }),
};
