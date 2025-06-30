<script lang="ts">
  import { 
    canvasObjectsArr, 
    geminiApiKey, 
    overlappedCanvases, 
    draggingCanvas, 
    combinationInProgress,
    generateOptionsPrompt,
    generateOptionCombinationPrompt,
    generateInstantPrompt,
    responseCount,
    generationMode,
    showDevInfo,
    apiKeyError
  } from '$lib/stores/canvasStore';
  import { fly } from 'svelte/transition';
  import { circOut, circIn } from 'svelte/easing';
  import { browser } from '$app/environment';

  const deleteIconPath = '/svg/icon-delete.svg';
  const arrowIconPath = '/svg/icon-arrow.svg';

  let devPanelOpen = false;
  let apiKeyFocused = false;
  let allowStoreApiKey = browser ? localStorage.getItem('gemini_api_key') !== null : false;
  let isApiKeyValid = true;

  // Reactive statement to validate API key length
  $: {
    if ($geminiApiKey && $geminiApiKey.length !== 39) {
      isApiKeyValid = false;
    } else {
      isApiKeyValid = true;
    }
  }

  function updateApiKey() {
    if (allowStoreApiKey && browser) {
      localStorage.setItem('gemini_api_key', $geminiApiKey);
    }
  }

  function handleCloseSettings() {
    $showDevInfo = false;
  }

  function handleToggleDevPanel() {
    devPanelOpen = !devPanelOpen;
  }

  function handleApiKeyFocus() {
    apiKeyFocused = true;
    $apiKeyError = false;
  }

  function handleApiKeyBlur() {
    apiKeyFocused = false;
  }

</script>

<div class="dev-info" in:fly={{ duration: 300, x: 100, easing: circOut }} out:fly={{ duration: 300, x: 100, easing: circIn }}>
  <div class="header">
    <h1>Settings</h1>
    <button
      class="close-button"
      aria-label="Close settings"
      onclick={handleCloseSettings}
    >
      <img src={deleteIconPath} alt="Close" width="32" height="32" />
    </button>
  </div>

  <div class="input-row api-key-row">
    <label for="apiKey">Gemini API key:</label>
    <input
      id="apiKey"
      bind:value={$geminiApiKey}
      onchange={updateApiKey}
      onfocus={handleApiKeyFocus}
      onblur={handleApiKeyBlur}
      type={apiKeyFocused ? "text" : "password"}
      placeholder="Enter API key"
      class:invalid={(!isApiKeyValid && $geminiApiKey.length > 0) || $apiKeyError}
    />
    {#if !isApiKeyValid && $geminiApiKey.length > 0}
      <span class="error-message">Invalid API key</span>
    {/if}
    {#if $apiKeyError}
      <span class="error-message">API key is required</span>
    {/if}
    {#if $geminiApiKey.length === 0}
    <div class="api-key-notice">
      <p>Add your Gemini API key</p>
      <ol>
        <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank">https://aistudio.google.com/apikey</a></li>
        <li>Click ‘Create API key’</li>
        <li>Connect to a <a href="https://console.cloud.google.com/projectselector2/home/project" target="_blank">Google Cloud project</a></li>
        <li>Copy and paste API key into input above</li>
      </ol>
    </div>
    {/if}
    <div class="store-api-key">
      <input
        type="checkbox"
        id="storeApiKey"
        bind:checked={allowStoreApiKey}
        onchange={() => {
          if (allowStoreApiKey && browser) {
            localStorage.setItem('gemini_api_key', $geminiApiKey);
          } else if (browser) {
            localStorage.removeItem('gemini_api_key');
          }
        }}
      />
      <label class="small-label" for="storeApiKey">Store in localStorage?</label>
    </div>
  </div>


  <div class="input-row">
    <label for="generationMode">Generation mode:</label>
    <select id="generationMode" bind:value={$generationMode}>
      <option value="instant">Instant</option>
      <option value="options">Options</option>
    </select>
  </div>

  {#if $generationMode === 'options'}
  <div class="input-row">
    <label for="responseCount">Options prompt:</label>
    <textarea
      id="optionsPrompt"
      bind:value={$generateOptionsPrompt}
    ></textarea>
  </div>
  <div class="input-row">
    <label for="responseCount">Combination prompt:</label>
    <textarea
      id="optionsPrompt"
      bind:value={$generateOptionCombinationPrompt}
    ></textarea>
  </div>
{/if}

{#if $generationMode === 'instant'}
  <div class="input-row">
    <label for="responseCount">Instant prompt:</label>
    <textarea
      id="optionsPrompt"
      bind:value={$generateInstantPrompt}
    ></textarea>
  </div>
{/if}

<button class="panel-button" onclick={handleToggleDevPanel}>
  <h2>Developer info</h2>
  <img src={arrowIconPath} alt="Arrow" width="24" height="24" style="transform: rotate({devPanelOpen ? '180deg' : '0deg'})" />
</button>

{#if devPanelOpen}
  <div class="info-row">
    <label for="canvasCount">Canvases: </label>
    <span id="canvasCount" role="status">{$canvasObjectsArr.length}</span>
  </div>
  <div class="info-row">
    <label for="draggingCanvas">Dragged canvas: </label>
    <span id="draggingCanvas" role="status">{$draggingCanvas?.id}</span>
  </div>
  <div class="info-row">
    <label for="draggedCanvas">Overlapped canvases: </label>
    <span id="overlappedCanvases" role="status">{JSON.stringify($overlappedCanvases?.map(c => c.id))}</span>
  </div>
  <div class="info-row">
    <label for="combinationInProgress">Combination in progress: </label>
    <span id="combinationInProgress" role="status">{JSON.stringify($combinationInProgress?.map(c => c.id))}</span>
  </div>
{/if}


</div>

<style>
  .dev-info {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--canvas-background);
    border: 2px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0px 1px 24px rgba(0, 0, 0, 0.06);;
    border-radius: 16px;
    backdrop-filter: blur(6px);
    padding: 16px;
    z-index: 2000;
    width: 280px;
    font-size: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 90vh;
    overflow-y: scroll;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .header h1 {
    font-size: 20px;
    font-weight: 400;
    margin-block-start: 0;
    margin-block-end: 0;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin: 0;
    transition: transform 0.3s cubic-bezier(0.090, 0.545, 0.305, 0.955);
  }

  .close-button img {
    opacity: 0.3;
    transition: opacity 0.3s cubic-bezier(0.090, 0.545, 0.305, 0.955);
  }

  .close-button:hover {
    transform: scale(1.05) ;
  }

  .close-button:hover img {
    opacity: 0.5;
  }

  .close-button:active {
    transform:  scale(.95);
  }

  .input-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
  }

  .input-row:last-child {
    margin-bottom: 0;
  }

  label {
    color: #666;
  }

  .api-key-row {
    gap: 6px;
  }

  .store-api-key {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .store-api-key input {
    max-width: max-content;
  }

  .api-key-notice {
    font-size: 14px;
    background: #D7EDFF;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border-radius: 8px;
  }

  .api-key-notice p {
    margin-block-start: 0;
    margin-block-end: 0;
  }

  .api-key-notice ol {
    padding-left: 16px;
    color: #666;
    font-size: 12px;
    margin-block-start: 0;
    margin-block-end: 0;
  }

  .api-key-notice ol li {
    margin-top: 4px;
  }

  .small-label {
    font-size: 12px;
    color: #666;
  }

  input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    font-family: monospace;
  }

  input:focus {
    outline: none;
    border: 1px solid rgba(0, 0, 0, 0.5);
  }

  input.invalid {
    border: 1px solid #ff4444;
  }

  input.invalid:focus {
    border: 1px solid #ff4444;
  }

  .error-message {
    color: #ff4444;
    font-size: 12px;
    font-weight: 400;
  }

  select {
    padding: 8px 12px;
    outline: 1px solid rgba(0, 0, 0, 0.2);
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'Aspekta', sans-serif;
    border-right: 16px solid transparent
  }

  select:focus {
    outline: 1px solid rgba(0, 0, 0, 0.5);
  }

  textarea {
    resize: none;
    padding: 8px 12px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    font-size: 12px;
    font-family: monospace;
    min-height: 100px;
  }

  textarea:focus {
    outline: none;
    border: 1px solid rgba(0, 0, 0, 0.5);
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .info-row:last-child {
    margin-bottom: 0;
  }

  .panel-button {
    background: none;
    padding: 0;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 0;
  }

  .panel-button h2 {
    font-size: 16px;
    font-weight: 400;
    margin-block-start: 0;
    margin-block-end: 0;
    font-family: 'Aspekta', sans-serif;
  }

  .panel-button img {
    opacity: 0.3;
    transition: opacity 0.3s cubic-bezier(0.090, 0.545, 0.305, 0.955);
  }

  .panel-button:hover img {
    opacity: 0.5;
  }

</style> 