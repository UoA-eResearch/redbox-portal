// Copyright (c) 2017 Queensland Cyber Infrastructure Foundation (http://www.qcif.edu.au/)
//
// GNU GENERAL PUBLIC LICENSE
//    Version 2, June 1991
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

import { Observable } from "rxjs";
import {Services as services}   from '@researchdatabox/redbox-core-types';
import { Sails, Model } from "sails";

declare var sails: Sails;
declare var RecordType: Model;
declare var _this;
declare var _;
declare var User;
declare var RecordsService;

export module Services {
  /**
   * Trigger related functions...
   *
   * Author: <a href='https://github.com/shilob' target='_blank'>Shilo Banihit</a>
   *
   */
  export class Trigger extends services.Core.Service {

    protected _exportedMethods: any = [
      'transitionWorkflow',
      'runHooksSync'
    ];

    /**
     * Used in changing the workflow stages automatically based on configuration.
     *
     * @author <a target='_' href='https://github.com/shilob'>Shilo Banihit</a>
     * @param  oid
     * @param  record
     * @param  options
     * @return
     */
    public transitionWorkflow(oid, record, options) {
      const triggerCondition = _.get(options, "triggerCondition", "");

      var variables= {};
      variables['imports'] = record;
      var compiled = _.template(triggerCondition, variables);
      const compileResult = compiled();
      sails.log.verbose(`Trigger condition for ${oid} ==> "${triggerCondition}", has result: '${compileResult}'`);
      if(_.isEqual(compileResult, "true")) {
        const workflowStageTarget = _.get(options, "targetWorkflowStageName", _.get(record, 'workflow.stage'));
        const workflowStageLabel = _.get(options, "targetWorkflowStageLabel", _.get(record, 'workflow.stageLabel'));
        sails.log.verbose(`Trigger condition met for ${oid}, transitioning to: ${workflowStageTarget}`);
        _.set(record,"workflow.stage",workflowStageTarget);
        _.set(record,"workflow.stageLabel",workflowStageLabel);
        // we need to update the form too!!!!
        _.set(record, "metaMetadata.form", _.get(options, "targetForm", record.metaMetadata.form));
      }

      return Observable.of(record);
    }

    /**
     *
     * By default, hooks are launched asynch, this method allows for synch running of hooks while not blocking the save request thread.
     * Will work as pre and post hooks.
     *
     *
     * @author <a target='_' href='https://github.com/shilob'>Shilo Banihit</a>
     * @param  oid
     * @param  record
     * @param  options
     * map of:
     *   "hooks" - array, same structure as that of hook option's "pre" and "post" fields
     * @return
     */
    public runHooksSync(oid, record, options, user) {
      sails.log.debug(`runHooksSync, starting...`);
      sails.log.debug(JSON.stringify(options));
      const hookFnArray = _.get(options, 'hooks');
      const hookFnDefArray = [];
      _.each(hookFnArray, (hookFnDef) => {
        const hookFnStr = _.get(hookFnDef, "function", null);
        if (!_.isEmpty(hookFnStr) && _.isString(hookFnStr)) {
          const hookFn = eval(hookFnStr);
          const hookOpt = _.get(hookFnDef, "options");
          if (_.isFunction(hookFn)) {
            sails.log.debug(`runHooksSync, adding: ${hookFnStr}`);
            hookFnDefArray.push({hookFn:hookFn, hookOpt:hookOpt});
          } else {
            sails.log.error(`runHooksSync, this is not a valid function: ${hookFnStr}`);
            sails.log.error(hookFnDef);
          }
        } else {
          sails.log.error(`runHooksSync, expected a string function name, got: ${hookFnStr}`);
          sails.log.error(hookFnDef);
        }
      });
      if (!_.isEmpty(hookFnDefArray)) {
        sails.log.debug(`runHooksSync, running..`);
        return Observable.from(hookFnDefArray)
        .concatMap(hookDef => {
          return hookDef.hookFn(oid, record, hookDef.hookOpt, user);
        })
        .last();
      } else {
        sails.log.debug(`runHooksSync, no observables to run`);
        return Observable.of(record);
      }
    }



  }
}
module.exports = new Services.Trigger().exports();
