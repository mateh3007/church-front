# 🚀 Guia de Migração para Vue.js

Este documento descreve a arquitetura atual da aplicação modularizada e propõe uma estratégia de migração para Vue.js.

---

## 📁 Estrutura Atual (Vanilla JS Modularizado)

```
church-front/
├── index-modular.html              # App shell principal
│
├── styles/                         # CSS Modular
│   ├── variables.css               # CSS Variables (cores, sombras, transições)
│   ├── base.css                    # Reset, tipografia, loading, toast
│   ├── components.css              # Botões, cards, forms, modals
│   └── layouts.css                 # Sidebar, main content, page headers
│
├── shared/                         # Utilitários compartilhados
│   ├── api.js                      # apiRequest() - chamadas HTTP
│   ├── state.js                    # AppState - estado global
│   ├── utils.js                    # formatCurrency, formatDate, etc.
│   ├── toast.js                    # showToast, showLoading, hideLoading
│   └── router.js                   # showScreen, navigateTo, getSectionTitle
│
└── pages/                          # Módulos por funcionalidade
    ├── auth/
    │   ├── auth.css
    │   ├── login.html
    │   ├── login.js
    │   ├── onboarding.html
    │   └── onboarding.js
    │
    ├── dashboard/
    │   ├── dashboard.css
    │   └── dashboard.js
    │
    ├── events/
    │   ├── events.css
    │   └── events.js
    │
    ├── recurring-events/
    │   ├── recurring-events.css
    │   └── recurring-events.js
    │
    ├── reports/
    │   ├── reports.css
    │   └── reports.js
    │
    ├── categories/
    │   ├── categories.css
    │   └── categories.js
    │
    ├── entries/
    │   ├── entries.css
    │   └── entries.js
    │
    ├── recurring-entries/
    │   ├── recurring-entries.css
    │   └── recurring-entries.js
    │
    └── entities/
        ├── entities.css            # CSS compartilhado
        ├── companies.js
        ├── churches.js
        ├── users.js
        └── ministries.js
```

---

## 🎯 Arquitetura Vue.js Proposta

### Stack Recomendada

| Tecnologia | Função |
|------------|--------|
| **Vue 3** | Framework reativo |
| **Vue Router** | Roteamento SPA |
| **Pinia** | Gerenciamento de estado |
| **TypeScript** | Tipagem estática |
| **Vite** | Build tool |
| **TailwindCSS** ou **CSS Modules** | Estilização |
| **Axios** | HTTP client |
| **VeeValidate + Zod** | Validação de forms |

---

### 📂 Estrutura Vue.js Proposta

```
church-vue/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── assets/
│   │   └── styles/
│   │       ├── variables.css       # Migrar de styles/variables.css
│   │       ├── base.css            # Migrar de styles/base.css
│   │       └── main.css            # Importa todos os estilos
│   │
│   ├── components/                 # Componentes reutilizáveis
│   │   ├── common/
│   │   │   ├── AppButton.vue
│   │   │   ├── AppCard.vue
│   │   │   ├── AppModal.vue
│   │   │   ├── AppTable.vue
│   │   │   ├── AppBadge.vue
│   │   │   ├── AppToast.vue
│   │   │   ├── AppLoading.vue
│   │   │   └── EmptyState.vue
│   │   │
│   │   ├── layout/
│   │   │   ├── TheSidebar.vue
│   │   │   ├── TheHeader.vue
│   │   │   └── MainLayout.vue
│   │   │
│   │   ├── forms/
│   │   │   ├── FormInput.vue
│   │   │   ├── FormSelect.vue
│   │   │   ├── FormTextarea.vue
│   │   │   ├── FormCheckbox.vue
│   │   │   └── FormDatePicker.vue
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatsGrid.vue
│   │   │   ├── FinancialChart.vue
│   │   │   └── AlertsList.vue
│   │   │
│   │   ├── entries/
│   │   │   ├── EntrySummaryCards.vue
│   │   │   ├── EntriesTable.vue
│   │   │   ├── EntryModal.vue
│   │   │   └── EntryFilters.vue
│   │   │
│   │   ├── categories/
│   │   │   ├── CategoryList.vue
│   │   │   ├── CategoryItem.vue      # Componente recursivo
│   │   │   └── CategoryModal.vue
│   │   │
│   │   ├── events/
│   │   │   ├── EventCard.vue
│   │   │   ├── EventsList.vue
│   │   │   └── EventModal.vue
│   │   │
│   │   ├── recurring/
│   │   │   ├── RecurringItem.vue
│   │   │   ├── RecurringList.vue
│   │   │   └── RecurringModal.vue
│   │   │
│   │   ├── reports/
│   │   │   ├── ReportTabs.vue
│   │   │   ├── ComparisonReport.vue
│   │   │   ├── MinistriesReport.vue
│   │   │   ├── ProjectionReport.vue
│   │   │   └── SummaryReport.vue
│   │   │
│   │   └── entities/
│   │       ├── EntityCard.vue
│   │       ├── EntityGrid.vue
│   │       ├── UserTable.vue
│   │       └── RoleBadge.vue
│   │
│   ├── views/                      # Páginas (1:1 com pages/)
│   │   ├── auth/
│   │   │   ├── LoginView.vue       # ← pages/auth/login.js
│   │   │   └── OnboardingView.vue  # ← pages/auth/onboarding.js
│   │   │
│   │   ├── DashboardView.vue       # ← pages/dashboard/dashboard.js
│   │   ├── CategoriesView.vue      # ← pages/categories/categories.js
│   │   ├── EntriesView.vue         # ← pages/entries/entries.js
│   │   ├── RecurringEntriesView.vue
│   │   ├── EventsView.vue
│   │   ├── RecurringEventsView.vue
│   │   ├── ReportsView.vue
│   │   ├── CompaniesView.vue
│   │   ├── ChurchesView.vue
│   │   ├── UsersView.vue
│   │   └── MinistriesView.vue
│   │
│   ├── stores/                     # Pinia stores (← shared/state.js)
│   │   ├── auth.store.ts           # token, user, login(), logout()
│   │   ├── app.store.ts            # company, church, onboarding
│   │   ├── categories.store.ts
│   │   ├── entries.store.ts
│   │   ├── recurring-entries.store.ts
│   │   ├── events.store.ts
│   │   ├── recurring-events.store.ts
│   │   ├── reports.store.ts
│   │   ├── companies.store.ts
│   │   ├── churches.store.ts
│   │   ├── users.store.ts
│   │   └── ministries.store.ts
│   │
│   ├── composables/                # Hooks reutilizáveis
│   │   ├── useApi.ts               # ← shared/api.js
│   │   ├── useToast.ts             # ← shared/toast.js
│   │   ├── useLoading.ts
│   │   ├── useAuth.ts
│   │   ├── useCurrency.ts          # ← shared/utils.js (formatCurrency)
│   │   └── useDate.ts              # ← shared/utils.js (formatDate, etc.)
│   │
│   ├── services/                   # API Services
│   │   ├── api.ts                  # Axios instance configurada
│   │   ├── auth.service.ts
│   │   ├── categories.service.ts
│   │   ├── entries.service.ts
│   │   ├── events.service.ts
│   │   ├── reports.service.ts
│   │   ├── companies.service.ts
│   │   ├── churches.service.ts
│   │   ├── users.service.ts
│   │   └── ministries.service.ts
│   │
│   ├── types/                      # TypeScript types
│   │   ├── auth.types.ts
│   │   ├── category.types.ts
│   │   ├── entry.types.ts
│   │   ├── event.types.ts
│   │   ├── report.types.ts
│   │   ├── company.types.ts
│   │   ├── church.types.ts
│   │   ├── user.types.ts
│   │   └── ministry.types.ts
│   │
│   ├── constants/                  # Constantes
│   │   ├── roles.ts                # userRoles
│   │   ├── event-types.ts          # eventTypes, eventStatuses
│   │   ├── frequencies.ts          # DAILY, WEEKLY, MONTHLY, YEARLY
│   │   └── routes.ts               # Nomes de rotas
│   │
│   ├── router/
│   │   ├── index.ts
│   │   ├── guards.ts               # Auth guards
│   │   └── routes.ts
│   │
│   ├── plugins/
│   │   ├── axios.ts
│   │   └── toast.ts
│   │
│   ├── App.vue
│   └── main.ts
│
├── .env
├── .env.development
├── .env.production
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js              # Se usar Tailwind
```

---

## 🔄 Mapeamento Detalhado

### 1. Estado Global

**Antes (`shared/state.js`):**
```javascript
const AppState = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user')),
    company: JSON.parse(localStorage.getItem('company')),
    church: JSON.parse(localStorage.getItem('church'))
};
```

**Depois (`stores/auth.store.ts`):**
```typescript
// stores/auth.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, Company, Church } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  const company = ref<Company | null>(JSON.parse(localStorage.getItem('company') || 'null'))
  const church = ref<Church | null>(JSON.parse(localStorage.getItem('church') || 'null'))

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  // Actions
  async function login(email: string, password: string) {
    const response = await authService.login(email, password)
    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
  }

  function logout() {
    token.value = null
    user.value = null
    company.value = null
    church.value = null
    localStorage.clear()
  }

  return { token, user, company, church, isAuthenticated, isAdmin, login, logout }
})
```

---

### 2. API Request

**Antes (`shared/api.js`):**
```javascript
async function apiRequest(method, endpoint, data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AppState.token}`
        }
    };
    // ...
}
```

**Depois (`composables/useApi.ts`):**
```typescript
// composables/useApi.ts
import { ref } from 'vue'
import { api } from '@/services/api'

export function useApi<T>() {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function execute(request: () => Promise<T>) {
    loading.value = true
    error.value = null
    try {
      data.value = await request()
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
    return data.value
  }

  return { data, loading, error, execute }
}

// services/api.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
})

api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})
```

---

### 3. Componentes de Página

**Antes (`pages/categories/categories.js`):**
```javascript
async function loadCategories(container) {
    categoriesData = await apiRequest('GET', '/financial-categories');
    container.innerHTML = renderCategoriesPage(categoriesData);
    setupCategoryEventListeners();
}
```

**Depois (`views/CategoriesView.vue`):**
```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCategoriesStore } from '@/stores/categories.store'
import CategoryList from '@/components/categories/CategoryList.vue'
import CategoryModal from '@/components/categories/CategoryModal.vue'

const store = useCategoriesStore()
const { categories, incomeCategories, expenseCategories, loading } = storeToRefs(store)

onMounted(() => {
  store.fetchCategories()
})
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h2>Categorias Financeiras</h2>
        <p>Gerencie as categorias de receitas e despesas</p>
      </div>
      <AppButton @click="store.openModal()">
        <i class="fas fa-plus" /> Nova Categoria
      </AppButton>
    </header>

    <div v-if="loading" class="loading">
      <AppLoading />
    </div>

    <div v-else class="categories-grid">
      <AppCard title="Receitas" :badge="incomeCategories.length">
        <CategoryList :categories="incomeCategories" type="INCOME" />
      </AppCard>

      <AppCard title="Despesas" :badge="expenseCategories.length">
        <CategoryList :categories="expenseCategories" type="EXPENSE" />
      </AppCard>
    </div>

    <CategoryModal />
  </div>
</template>

<style scoped>
.categories-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}
</style>
```

---

### 4. Roteamento

**Antes (`shared/router.js`):**
```javascript
function navigateTo(section) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    // ...
}
```

**Depois (`router/routes.ts`):**
```typescript
// router/routes.ts
import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  // Auth (sem layout)
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/views/auth/OnboardingView.vue'),
    meta: { requiresAuth: true }
  },

  // App (com layout)
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'Dashboard', icon: 'fas fa-chart-pie' }
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('@/views/CategoriesView.vue'),
        meta: { title: 'Categorias', icon: 'fas fa-tags' }
      },
      {
        path: 'entries',
        name: 'entries',
        component: () => import('@/views/EntriesView.vue'),
        meta: { title: 'Lançamentos', icon: 'fas fa-money-bill-wave' }
      },
      // ... outras rotas
    ]
  }
]

// router/guards.ts
import type { NavigationGuard } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

export const authGuard: NavigationGuard = (to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
}
```

---

### 5. Utilitários

**Antes (`shared/utils.js`):**
```javascript
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}
```

**Depois (`composables/useCurrency.ts`):**
```typescript
// composables/useCurrency.ts
export function useCurrency() {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })

  function format(value: number | string | null): string {
    return formatter.format(Number(value) || 0)
  }

  function formatShort(value: number): string {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`
    return `R$ ${value.toFixed(0)}`
  }

  return { format, formatShort }
}

// Uso no componente
const { format: formatCurrency } = useCurrency()
```

---

## 📋 Checklist de Migração

### Fase 1: Setup Inicial
- [ ] Criar projeto Vue 3 + Vite + TypeScript
- [ ] Configurar ESLint + Prettier
- [ ] Instalar dependências (Pinia, Vue Router, Axios)
- [ ] Migrar CSS variables e base styles
- [ ] Configurar Tailwind ou CSS Modules

### Fase 2: Infraestrutura
- [ ] Criar API service com Axios
- [ ] Criar stores básicas (auth, app)
- [ ] Implementar composables (useApi, useToast, useLoading)
- [ ] Configurar roteamento com guards
- [ ] Criar layout principal (Sidebar + MainContent)

### Fase 3: Componentes Base
- [ ] AppButton, AppCard, AppModal, AppTable
- [ ] FormInput, FormSelect, FormTextarea
- [ ] AppToast, AppLoading, EmptyState
- [ ] AppBadge (status, role)

### Fase 4: Migrar Views (ordem sugerida)
1. [ ] LoginView + OnboardingView
2. [ ] DashboardView
3. [ ] CategoriesView
4. [ ] EntriesView + RecurringEntriesView
5. [ ] EventsView + RecurringEventsView
6. [ ] ReportsView (com tabs)
7. [ ] CompaniesView, ChurchesView, UsersView, MinistriesView

### Fase 5: Refinamentos
- [ ] Adicionar validação de forms (VeeValidate + Zod)
- [ ] Implementar loading states e skeleton
- [ ] Adicionar transições e animações
- [ ] Otimizar bundle (lazy loading)
- [ ] Testes unitários (Vitest)
- [ ] Testes E2E (Playwright ou Cypress)

---

## 🎨 Migração de Estilos

### Opção A: CSS Modules (recomendado para migração gradual)

```vue
<style module>
.categoriesGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}
</style>

<template>
  <div :class="$style.categoriesGrid">...</div>
</template>
```

### Opção B: Tailwind CSS (recomendado para novos projetos)

```vue
<template>
  <div class="grid grid-cols-2 gap-6">...</div>
</template>
```

### Opção C: Scoped CSS (mais simples)

```vue
<style scoped>
.categories-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}
</style>
```

---

## 🔗 Recursos Úteis

- [Vue 3 Docs](https://vuejs.org/guide/introduction.html)
- [Pinia Docs](https://pinia.vuejs.org/)
- [Vue Router Docs](https://router.vuejs.org/)
- [VeeValidate](https://vee-validate.logaretm.com/v4/)
- [Vite](https://vitejs.dev/)

---

## 📝 Notas Finais

A arquitetura modular atual foi projetada pensando nessa migração. Cada arquivo JS em `pages/` mapeia diretamente para uma View Vue, e as funções internas se tornam:

| Vanilla JS | Vue 3 |
|------------|-------|
| `loadX()` | `onMounted` + store action |
| `renderXPage()` | Template + computed |
| `setupEventListeners()` | Bindings (`@click`, `@submit`) |
| `handleSubmit()` | Método do componente ou store action |
| `editX()`, `deleteX()` | Store actions |
| Estado local (`let xData`) | Store state |
| `AppState` | Pinia store global |

A migração pode ser feita de forma incremental, mantendo a versão vanilla em paralelo enquanto as views Vue são implementadas.

