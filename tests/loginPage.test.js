import { expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import LoginPage from '../src/components/loginPage.vue'
import { mount } from '@vue/test-utils'

it('visar felmeddelande vid tom inmatning', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: LoginPage }]
  })

  const wrapper = mount(LoginPage, {
    global: {
      plugins: [router]
    }
  })

  await wrapper.find('form').trigger('submit')

  expect(wrapper.find('[role="alert"]').text()).toContain(
    'Ange en giltig e-postadress.'
  )

  wrapper.unmount()
})

it('visar fält för att bekräfta lösenord vid registrering', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: LoginPage }]
  })

  const wrapper = mount(LoginPage, {
    global: {
      plugins: [router]
    }
  })

  await wrapper.findAll('.tabs button')[1].trigger('click')

  expect(wrapper.find('input[placeholder="Upprepa lösenord"]').exists()).toBe(true)

  wrapper.unmount()
})

it('visar felmeddelande om lösenordet saknas', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: LoginPage }]
  })

  const wrapper = mount(LoginPage, {
    global: {
      plugins: [router]
    }
  })

  await wrapper.find('input[type="email"]').setValue('test@example.com')
  await wrapper.find('form').trigger('submit')

  expect(wrapper.find('[role="alert"]').text()).toContain('Ange ditt lösenord.')

  wrapper.unmount()
})