/**
 * @file core/registry/plugin-registry.ts
 * @description Generic, strongly-typed Open/Closed registry for motion plugins.
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - Deterministic, non-mutating list queries.
 * - Provides register, registerMany, get, has, list, and unregister operations.
 */

export class PluginRegistry<T extends { id: string }> {
  private readonly items = new Map<string, T>()

  /**
   * Registers a plugin. Replaces existing registration if ID matches.
   *
   * @param plugin - The plugin instance to register.
   * @returns this registry instance for chaining.
   */
  register(plugin: T): this {
    this.items.set(plugin.id, plugin)
    return this
  }

  /**
   * Registers multiple plugins in batch.
   *
   * @param plugins - Array or readonly collection of plugins.
   * @returns this registry instance for chaining.
   */
  registerMany(plugins: readonly T[]): this {
    for (const plugin of plugins) {
      this.items.set(plugin.id, plugin)
    }
    return this
  }

  /**
   * Retrieves a plugin by ID.
   *
   * @param id - Unique plugin identifier.
   * @returns The registered plugin or undefined if not found.
   */
  get(id: string): T | undefined {
    return this.items.get(id)
  }

  /**
   * Checks whether a plugin with the given ID is registered.
   *
   * @param id - Unique plugin identifier.
   * @returns True if registered.
   */
  has(id: string): boolean {
    return this.items.has(id)
  }

  /**
   * Returns a snapshot array of all registered plugins in registration order.
   *
   * @returns Array of registered plugins.
   */
  list(): T[] {
    return Array.from(this.items.values())
  }

  /**
   * Unregisters a plugin by ID.
   *
   * @param id - Unique plugin identifier.
   * @returns True if the plugin existed and was removed.
   */
  unregister(id: string): boolean {
    return this.items.delete(id)
  }

  /**
   * Clears all registered plugins from this registry.
   */
  clear(): void {
    this.items.clear()
  }
}
