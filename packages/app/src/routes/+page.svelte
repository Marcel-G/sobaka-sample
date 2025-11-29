<script lang="ts">
  import AppLayout from '../components/AppLayout.svelte'
</script>

<AppLayout>
  <div class="min-h-screen flex flex-col items-center justify-center p-8 bg-grid">
    <div class="max-w-2xl text-center space-y-8">
      <div class="space-y-4">
        <h1 class="text-5xl font-bold text-light mb-4">Sobaka Sample 🥁🐕</h1>
        <p class="text-xl text-gray-300 leading-relaxed">
          A collaborative modular synthesizer playground in your browser. Create, share,
          and experiment with sound in real-time.
        </p>
      </div>

      <div class="space-y-4">
        <a href="/workspace/new">
          <button
            class="bg-blue text-light px-8 py-4 rounded-lg cursor-pointer
            font-semibold text-lg transition-colors duration-200 shadow-lg"
          >
            Create New Workspace
          </button>
        </a>
      </div>

      <!-- Footer -->
      <div class="pt-8">
        <a
          href="https://github.com/Marcel-G/sobaka-sample"
          class="text-light transition-colors duration-200"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on GitHub →
        </a>
      </div>
    </div>
  </div>
</AppLayout>

<style lang="postcss">
  .bg-grid {
    background: conic-gradient(from 90deg at 1px 1px, #0000 90deg, var(--color-dark) 0) 0
      0 / 1rem 1rem;
  }
</style>
