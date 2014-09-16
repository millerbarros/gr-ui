<div class="form-group has-feedback" ng-class="state ? 'has-' + state : ''">
    <label ng-class="{'sr-only': !field.showLabel}">{{field.label}}</label>
    <div class="input-group">
        <span class="input-group-addon" ng-if="field.icon">
            <i class="{{field.icon}}"></i>
        </span>
        <input class="form-control"/>
        <span class="input-group-addon form-control-icon" ng-if="state">
            <span class="fa fa-fw fa-times form-control-feedback form-control-feedback-error"></span>
            <span class="fa fa-fw fa-check form-control-feedback form-control-feedback-success"></span>
        </span>
    </div>
</div>
