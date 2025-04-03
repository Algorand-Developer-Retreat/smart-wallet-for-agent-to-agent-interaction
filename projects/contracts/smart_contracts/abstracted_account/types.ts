import { arc4 } from "@algorandfoundation/algorand-typescript";

export class PluginsKey extends arc4.Struct<{
  /** The application containing plugin logic */
  application: arc4.UintN64;
  /** The address that is allowed to initiate a rekey to the plugin */
  allowedCaller: arc4.Address;
}> { }

export class PluginInfo extends arc4.Struct<{
  /** The last round at which this plugin can be called */
  lastValidRound: arc4.UintN64;
  /** The number of rounds that must pass before the plugin can be called again */
  cooldown: arc4.UintN64;
  /** The last round the plugin was called */
  lastCalled: arc4.UintN64;
  /** Whether the plugin has permissions to change the admin account */
  adminPrivileges: arc4.Bool;
  /** The methods that are allowed to be called for the plugin by the address */
  methods: arc4.DynamicArray<MethodInfo>;
}> { }

export class MethodRestriction extends arc4.Struct<{
    /** The method signature */
    selector: arc4.StaticBytes<4>;
    /** The number of rounds that must pass before the method can be called again */
    cooldown: arc4.UintN64;
}> { }

export class MethodInfo extends arc4.Struct<{
  /** The method signature */
  selector: arc4.StaticBytes<4>;
  /** The number of rounds that must pass before the method can be called again */
  cooldown: arc4.UintN64;
  /** The last round the method was called */
  lastCalled: arc4.UintN64;
}> { }

export type PluginValidation = {
  exists: boolean;
  expired: boolean;
  hasCooldown: boolean;
  onCooldown: boolean;
  hasMethodRestrictions: boolean;
  valid: boolean;
}

export type MethodValidation = {
  methodAllowed: boolean;
  methodHasCooldown: boolean;
  methodOnCooldown: boolean;
}

export type FullPluginValidation = {
  exists: boolean;
  expired: boolean;
  hasCooldown: boolean;
  onCooldown: boolean;
  hasMethodRestrictions: boolean;
  methodAllowed: boolean;
  methodHasCooldown: boolean;
  methodOnCooldown: boolean;
  valid: boolean;
}
